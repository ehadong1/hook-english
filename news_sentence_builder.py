"""
"오늘의 뉴스 3문장" 수집 스크립트.

업무 분야 12개별로 Exa에서 최근 실제 뉴스/기사를 검색하고, GPT-4o-mini로 그중
학습하기 좋은 영어 문장을 수준별로 추출 + 1차 채점한 뒤, phrase_bank_builder.py와 같은
2단계 검수(기계 필터 + 독립 2차 검수)를 거쳐 Supabase hook_news_sentences 테이블에
저장합니다. 여기 저장된 문장은 웹앱의 "최신 뉴스 3문장" 메뉴에 그대로 노출됩니다
(승인된 것만), 그래서 품질 검수를 더 보수적으로 잡았습니다.

이 스크립트는 사용자의 실제 컴퓨터 터미널에서 실행해야 합니다.
(Claude의 샌드박스는 Exa API로 나가는 외부 네트워크 요청이 막혀 있어 여기서 실행할 수 없습니다.)

사전 준비:
1. supabase_news_sentences_schema.sql, supabase_news_v2.sql을 Supabase SQL Editor에서 먼저 실행
2. .env에 EXA_API_KEY / OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
   네 개가 이미 있어야 함 (phrase_bank_builder.py와 동일한 키를 그대로 씁니다)
3. pip install -r requirements.txt

실행:
  매일 모드(기본, 승인 문장 하루 20개 목표):  python3 news_sentence_builder.py
  처음 대량 채우기:  NEWS_MODE=bulk python3 news_sentence_builder.py
  (대량 모드를 또 돌릴 때는 NEWS_BULK_ROUND=1, 2 ... 로 바꾸면 다른 검색 각도를 씁니다)
"""

import os
import re
import json
import time
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

load_dotenv()

EXA_API_KEY = os.getenv("EXA_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not all([EXA_API_KEY, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    raise SystemExit(
        "❌ .env에 EXA_API_KEY / OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY "
        "네 개가 다 있어야 합니다. 빠진 게 있는지 확인하세요."
    )

client = OpenAI(api_key=OPENAI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# 앱 설문의 업무 분야 12개 (phrase_generator.py / src/data/survey.ts 와 같은 이름)
FIELDS = ["IT/소프트웨어", "제품/PM", "마케팅/세일즈", "재무/회계", "HR/채용", "법무/컴플라이언스",
          "제조/생산/품질", "의료/바이오", "금융/투자", "컨설팅/전략", "디자인/크리에이티브", "경영/임원"]

# 앱의 TOPIC_TO_BANK와 같은 매핑 (예전 화면과의 호환용 topic 칸)
TOPIC_TO_BANK = {
    "IT/소프트웨어": "비즈니스/IT 트렌드", "제품/PM": "비즈니스/IT 트렌드", "마케팅/세일즈": "일상 및 오피스 회화",
    "재무/회계": "비즈니스/IT 트렌드", "HR/채용": "일상 및 오피스 회화", "법무/컴플라이언스": "비즈니스/IT 트렌드",
    "제조/생산/품질": "비즈니스/IT 트렌드", "의료/바이오": "비즈니스/IT 트렌드", "금융/투자": "최신 시사 및 뉴스",
    "컨설팅/전략": "비즈니스/IT 트렌드", "디자인/크리에이티브": "일상 및 오피스 회화", "경영/임원": "비즈니스/IT 트렌드",
}

# 분야별 검색 키워드 + 여러 각도의 검색 문장 (매번 다른 기사가 나오도록 돌려 씁니다)
FIELD_KW = {
    "IT/소프트웨어": "software engineering and cloud technology",
    "제품/PM": "product management and product launches",
    "마케팅/세일즈": "marketing and sales strategy",
    "재무/회계": "corporate finance and accounting",
    "HR/채용": "hiring, HR and workplace policy",
    "법무/컴플라이언스": "corporate legal affairs and compliance regulation",
    "제조/생산/품질": "manufacturing, supply chain and quality control",
    "의료/바이오": "healthcare, biotech and clinical research",
    "금융/투자": "banking, investing and financial markets",
    "컨설팅/전략": "management consulting and business strategy",
    "디자인/크리에이티브": "design, branding and creative industry",
    "경영/임원": "executive leadership and corporate management",
}
ANGLES = [
    "latest {kw} news",
    "{kw} company announces new plan",
    "{kw} trends and challenges this week",
    "how teams in {kw} are changing the way they work",
    "{kw} policy or regulation update",
    "{kw} leaders interview insights",
]

# 수준별 최대 단어 수 (phrase_generator.py와 같은 기준)
LEVEL_MAX_WORDS = {"왕초보": 9, "기초 회화": 15, "중상급": 22}

STATS: dict = {}


def bump(k: str, n: int = 1):
    STATS[k] = STATS.get(k, 0) + n


DAILY_TARGET = int(os.getenv("NEWS_DAILY_TARGET", "20"))     # 하루 목표 승인 문장 수
DAILY_FIELDS = int(os.getenv("NEWS_DAILY_FIELDS", "8"))      # 하루에 돌아가며 다룰 분야 수
MODE = os.getenv("NEWS_MODE", "daily")                        # daily | bulk
BULK_ANGLES = int(os.getenv("NEWS_BULK_ANGLES", "3"))         # bulk일 때 분야마다 쓸 검색 각도 수
BULK_ROUND = int(os.getenv("NEWS_BULK_ROUND", "0"))           # bulk를 여러 번 돌릴 때 0,1,... 로 바꾸면 다른 각도를 씁니다
RECENT_DAYS = 21                                              # 최근 N일 안의 기사만

GRAMMAR_KEYS = [
    "politeRequest", "nearFuture", "reportedSpeech", "phrasalVerb",
    "modalSuggestion", "conditionalPossibility", "presentProgressive",
    "idiomaticExpression", "quantifier", "letMeStructure", "concessiveContrast",
]
LEVELS = ["왕초보", "기초 회화", "중상급"]
TONES = ["정중한 비즈니스", "중립 실무", "캐주얼 친근"]

# GPT가 "중요해 보이는" 문법만 뽑다 보면 be+~ing 같은 기본 구조를 그냥 지나칠 때가
# 있습니다 (예: "Meta is providing open-source firmware." = presentProgressive인데도
# GPT가 빈 배열을 준 적이 있었음). 그래서 GPT 결과에 이 정규식 결과를 "더해서"
# 보완합니다 (빼는 용도가 아니라 채우는 용도). idiomaticExpression은 정규식으로
# 안정적으로 잡기 어려워 GPT 판단에만 맡깁니다.
REGEX_GRAMMAR = {
    "politeRequest": r"\b(could you|can you|would you|would you mind)\b",
    "nearFuture": r"\b(going to|gonna)\b",
    "reportedSpeech": r"\b(said|told|mentioned|noted|flagged)\b",
    "phrasalVerb": r"\b(figure out|get back to|look into|follow up|iron out|roll out|kick off|catch up|check in|reach out)\b",
    "modalSuggestion": r"\b(should|might want to|need to)\b",
    "conditionalPossibility": r"\b(could|might|may)\b",
    "presentProgressive": r"\b(is|are|am|was|were)\s+\w+ing\b",
    "quantifier": r"\b(a lot of|plenty of|tons of|a number of|a handful of)\b",
    "letMeStructure": r"\blet me\b",
    "concessiveContrast": r"\b(but|although|though|however|despite|in spite of)\b",
}


def detect_grammar_keys(text: str, gpt_keys: list[str]) -> list[str]:
    """GPT가 준 grammarKeys에, 정규식으로 찾은 기본 구조를 더해서 돌려줍니다."""
    found = [k for k in (gpt_keys or []) if k in GRAMMAR_KEYS]
    for key, pattern in REGEX_GRAMMAR.items():
        if key not in found and re.search(pattern, text, re.IGNORECASE):
            found.append(key)
    return found

EXTRACT_SYSTEM_PROMPT = f"""당신은 비즈니스 영어 학습 콘텐츠 에디터입니다.
아래에 최근 실제 뉴스/기사에서 가져온 텍스트 조각들이 [1], [2]... 번호와 함께 주어집니다.
요청받은 업무 분야의 직장인이 학습하기 좋은 영어 문장을 요청받은 개수만큼 뽑아 주세요.

중요한 규칙:
- 사실을 지어내지 마세요. 원문에 있는 문장을 그대로 쓰거나, 긴 문장은 같은 사실만 담아 한 문장으로 줄이거나 쉽게 다듬는 것만 허용됩니다.
- 수준(level)을 고르게 섞으세요: {LEVELS}. 요청에 목표 비율이 있으면 따르세요.
  · 왕초보: 9단어 이하, 쉬운 단어와 짧은 구조
  · 기초 회화: 15단어 이하
  · 중상급: 22단어 이하, 관용 표현·연어·완곡한 표현·복문 등 실제로 한 단계 높은 표현
- 표현이 다양해야 합니다. 같은 두 단어로 시작하는 문장을 둘 이상 뽑지 말고, 구동사·관용 표현·연어·다른 문장 구조를 고르게 쓰세요.
- 사람 이름이나 회사 이름이 핵심이라 그것을 몰라서는 이해하기 어려운 문장, 숫자 나열뿐인 문장, 맥락 없이 이해하기 어려운 문장은 제외하세요.
- tone은 {TONES} 중 하나, level은 {LEVELS} 중 하나.
- grammarKeys는 최대 2개, 아래 목록에서만 (없으면 빈 배열): {GRAMMAR_KEYS}
- vocab은 문장에 실제로 등장하는 핵심 단어 최대 3개: word, pos(명사/동사/형용사/부사/전치사/접속사/구동사/관용구/연어 중 하나), meaning(한글), note(짧은 설명).
- "source"는 그 문장을 가져온 조각의 번호(정수).
- score는 1~5점(학습 콘텐츠로서의 품질). 후하게 주지 마세요.
- 적합한 문장이 부족하면 적게 반환해도 됩니다. 억지로 채우지 마세요.

각 항목 JSON 스키마:
{{
  "text": "영어 문장",
  "translation": "자연스러운 한글 번역",
  "level": "...",
  "tone": "...",
  "situations": ["한글 상황 태그 최대 2개"],
  "grammarKeys": ["..."],
  "vocab": [{{"word": "...", "pos": "...", "meaning": "...", "note": "..."}}],
  "source": 1,
  "score": 1~5,
  "reason": "점수 이유 한 줄 (한글)"
}}

반드시 {{"items": [...]}} 형태의 JSON 객체 하나로만 응답하세요."""

VERIFIER_MODEL = "gpt-4o"
VERIFIER_SYSTEM_PROMPT = """당신은 영어 학습 콘텐츠를 검수하는 매우 엄격한 원어민 에디터입니다.
영어 문장, 한글 번역, 표시된 수준, 업무 분야가 주어집니다. 다른 사람이 이미 점수를 매겼을 수 있지만 모르는 상태로 처음부터 독립적으로 평가하세요.

낮은 점수를 주어야 하는 경우:
- 영어가 어색하거나 문법이 부자연스러움
- 한글 번역이 부정확하거나 뉘앙스·의미가 다름 (translation_ok=false)
- 5단어 미만이거나 맥락 없이는 이해하기 어려움
- 특정 인물의 명예를 훼손하거나 민감한 정치적 주장을 사실처럼 단정함
- 학습자가 직장에서 말하거나 쓰는 데 거의 쓸 일이 없는 내용

JSON으로만 응답하세요:
{"score": 1~5 정수, "translation_ok": true/false, "level_fit": 표시된 수준에 어휘·구조 난이도가 맞으면 true, "best_level": 이 문장에 가장 맞는 수준("왕초보"/"기초 회화"/"중상급" 중 하나), "belongs_to_field": 주어진 업무 분야 직장인에게 실제로 관련 있으면 true, "reason": "한 줄 이유(한글)"}"""


def exa_search(query: str, num_results: int = 8) -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(days=RECENT_DAYS)).strftime("%Y-%m-%dT00:00:00.000Z")
    resp = requests.post(
        "https://api.exa.ai/search",
        headers={"x-api-key": EXA_API_KEY, "Content-Type": "application/json"},
        json={
            "query": query,
            "numResults": num_results,
            "category": "news",
            "startPublishedDate": since,
            "contents": {"text": {"maxCharacters": 3500}},
        },
        timeout=40,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def extract_with_gpt(field: str, snippets: list[dict], count: int, level_plan: str) -> list[dict]:
    parts = []
    for i, sn in enumerate(snippets, start=1):
        parts.append(f"[{i}] (출처: {sn.get('url', '알 수 없음')})\n{sn.get('text', '')}")
    combined = "\n\n---\n\n".join(parts)
    if not combined.strip():
        return []
    user = f"업무 분야: {field}\n뽑을 개수: {count}개 이내\n수준 목표: {level_plan}\n\n{combined}"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.4,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": EXTRACT_SYSTEM_PROMPT}, {"role": "user", "content": user}],
    )
    try:
        return json.loads(response.choices[0].message.content).get("items", [])
    except Exception as e:
        print(f"  ⚠️ GPT 응답 파싱 실패: {e}")
        return []


def verify_independently(english: str, translation: str, level: str, field: str) -> dict:
    try:
        response = client.chat.completions.create(
            model=VERIFIER_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": VERIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": f'영어: "{english}"\n한글 번역: "{translation}"\n표시된 수준: {level}\n업무 분야: {field}'},
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  ⚠️ 2차 검수 실패(안전하게 보류 처리): {e}")
        return {"score": 0, "translation_ok": False, "level_fit": False, "belongs_to_field": False, "reason": f"2차 검수 호출 실패: {e}"}


def norm(t: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()


def grounded(text: str, source_text: str) -> bool:
    """문장의 단어 대부분이 실제 기사 조각에 들어 있는지 확인합니다 (지어낸 문장 방지)."""
    words = [w for w in norm(text).split() if len(w) > 3]
    if not words:
        return False
    src = set(norm(source_text).split())
    hit = sum(1 for w in words if w in src)
    return hit / len(words) >= 0.6


def load_existing_texts() -> set[str]:
    seen, page = set(), 0
    while True:
        chunk = supabase.table("hook_news_sentences").select("text").range(page * 1000, page * 1000 + 999).execute().data
        for r in chunk:
            seen.add(norm(r["text"]))
        if len(chunk) < 1000:
            break
        page += 1
    return seen


def process_field(field: str, query: str, count: int, level_plan: str, seen: set[str], openers: dict) -> tuple[int, int]:
    """한 분야·한 검색 문장을 처리하고 (저장한 개수, 승인한 개수)를 돌려줍니다."""
    print(f"\n=== {field} ===\n  🔎 {query}")
    try:
        results = exa_search(query)
    except Exception as e:
        print(f"  ❌ Exa 검색 실패: {e}")
        return 0, 0
    print(f"  → 기사 {len(results)}개")
    bump("검색")
    bump("기사", len(results))
    items = extract_with_gpt(field, results, count, level_plan)
    print(f"  → 후보 {len(items)}개")
    bump("후보", len(items))
    inserted = approved = 0
    for item in items:
        text = (item.get("text") or "").strip()
        translation = (item.get("translation") or "").strip()
        if not text or not translation:
            continue
        key = norm(text)
        if key in seen:
            print(f"  ⏭️ 중복: {text!r}")
            bump("제외-중복")
            continue
        words = len(text.split())
        level = item.get("level") if item.get("level") in LEVELS else LEVELS[1]
        # 단어 수가 그 수준의 한도를 넘으면 한 단계 위 수준으로 올리고, 22단어를 넘으면 버립니다.
        for lv in LEVELS[LEVELS.index(level):]:
            if words <= LEVEL_MAX_WORDS[lv]:
                level = lv
                break
        else:
            print(f"  🚫 너무 김({words}단어): {text!r}")
            bump("제외-22단어초과")
            continue
        if words < 5:
            print(f"  🚫 너무 짧음: {text!r}")
            bump("제외-5단어미만")
            continue
        opener = " ".join(norm(text).split()[:2])
        if openers.get(opener, 0) >= 2:
            print(f"  ⏭️ 같은 시작 표현 제한({opener}): {text!r}")
            bump("제외-같은시작표현")
            continue
        src_idx = item.get("source") if isinstance(item.get("source"), int) else 1
        src = results[src_idx - 1] if 1 <= src_idx <= len(results) else (results[0] if results else {})
        if not grounded(text, src.get("text", "")):
            print(f"  🚫 기사에서 확인되지 않는 문장: {text!r}")
            bump("제외-기사에없음")
            continue
        tone = item.get("tone") if item.get("tone") in TONES else TONES[1]
        grammar_keys = detect_grammar_keys(text, item.get("grammarKeys"))
        score1 = item.get("score", 0)
        v = verify_independently(text, translation, level, field)
        score2 = v.get("score", 0)
        combined = min(score1, score2)
        belongs = bool(v.get("belongs_to_field"))
        # 수준이 안 맞는다고 판단되면, 검수 모델이 제안한 수준으로 옮기고 (단어 수 한도 안에서) 다시 판단합니다.
        level_fit = bool(v.get("level_fit", True))
        best = v.get("best_level")
        if not level_fit and best in LEVELS and best != level and words <= LEVEL_MAX_WORDS[best]:
            level, level_fit = best, True
            bump("수준조정")
        if not v.get("translation_ok", True):
            status, reason = "rejected", f"2차 검수 거부(번역 부정확): {v.get('reason', '')}"
        elif score1 >= 4 and score2 >= 4 and level_fit:
            status, reason = "approved", f"1차 {score1}점 / 2차 {score2}점: {v.get('reason', '')}"
        else:
            status, reason = "pending_review", f"1차 {score1}점 / 2차 {score2}점 / 수준적합 {level_fit} — 확인 필요: {v.get('reason', '')}"
        row = {
            "topic": TOPIC_TO_BANK[field],
            "field_tag": field if belongs else None,   # 분야와 관련 없다고 판단되면 공통 문장으로만 쓰입니다
            "level": level,
            "tone": tone,
            "situations": item.get("situations") or [],
            "text": text,
            "translation": translation,
            "grammar_keys": grammar_keys,
            "vocab": item.get("vocab") or [],
            "native_alternatives": [],
            "source_url": src.get("url"),
            "verified_score": combined,
            "verified_reason": reason,
            "status": status,
        }
        try:
            supabase.table("hook_news_sentences").insert(row).execute()
        except Exception as e:
            print(f"  ❌ 저장 실패: {e}")
            continue
        seen.add(key)
        inserted += 1
        bump("저장-" + status)
        if status != "approved":
            bump("사유-" + ("점수<4" if min(score1, score2) < 4 else "수준부적합" if not level_fit else "기타"))
        icon = "🚫"
        if status == "approved":
            approved += 1
            openers[opener] = openers.get(opener, 0) + 1
            icon = "✅"
        elif status == "pending_review":
            icon = "🟡"
        print(f"  {icon} [{status}] {level} ({combined}점{'' if belongs else ', 분야무관'}) {text!r}")
    time.sleep(1)
    return inserted, approved


def main():
    seen = load_existing_texts()
    openers: dict = {}
    total_inserted = total_approved = 0
    today = datetime.now(timezone.utc).date()
    print(f"모드: {MODE} / 기존 문장 {len(seen)}개")

    if MODE == "bulk":
        # 처음 한 번 대량으로 채우기: 12개 분야 × 여러 검색 각도
        for a in range(BULK_ANGLES):
            angle = ANGLES[(BULK_ROUND * BULK_ANGLES + a) % len(ANGLES)]
            for field in FIELDS:
                i, ap = process_field(field, angle.format(kw=FIELD_KW[field]), 10, "왕초보 3개, 기초 회화 3개, 중상급 4개", seen, openers)
                total_inserted += i
                total_approved += ap
    else:
        # 매일: 분야를 돌려 가며 8개 분야씩, 승인 문장이 하루 목표(기본 20개)가 될 때까지
        start = (today.toordinal() * DAILY_FIELDS) % len(FIELDS)
        order = [FIELDS[(start + k) % len(FIELDS)] for k in range(len(FIELDS))]
        angle = ANGLES[today.toordinal() % len(ANGLES)]
        passes = [order[:DAILY_FIELDS], order[DAILY_FIELDS:]]  # 목표에 못 미치면 나머지 분야로 한 번 더
        for group in passes:
            for field in group:
                if total_approved >= DAILY_TARGET:
                    break
                i, ap = process_field(field, angle.format(kw=FIELD_KW[field]), 6, "왕초보 2개, 기초 회화 2개, 중상급 2개", seen, openers)
                total_inserted += i
                total_approved += ap
            if total_approved >= DAILY_TARGET:
                break

    print("\n[집계] " + ", ".join(f"{k} {v}" for k, v in sorted(STATS.items())))
    print(f"\n총 {total_inserted}개 저장 (그중 {total_approved}개 자동 승인).")
    if MODE != "bulk" and total_approved < DAILY_TARGET:
        print(f"⚠️ 오늘 승인 {total_approved}개로 목표 {DAILY_TARGET}개에 못 미쳤어요 (기사·검수 통과가 부족한 날).")


if __name__ == "__main__":
    main()
