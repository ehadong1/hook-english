"""
"오늘의 뉴스 3문장" 수집 스크립트.

업종 카테고리별로 Exa에서 오늘자 실제 뉴스/기사를 검색하고, GPT-4o-mini로 그중
학습하기 좋은 영어 문장 3개를 추출 + 1차 채점한 뒤, phrase_bank_builder.py와 같은
2단계 검수(기계 필터 + 독립 2차 검수)를 거쳐 Supabase hook_news_sentences 테이블에
저장합니다. 여기 저장된 문장은 웹앱의 "최신 뉴스 3문장" 메뉴에 그대로 노출됩니다
(승인된 것만), 그래서 품질 검수를 더 보수적으로 잡았습니다.

이 스크립트는 사용자의 실제 컴퓨터 터미널에서 실행해야 합니다.
(Claude의 샌드박스는 Exa API로 나가는 외부 네트워크 요청이 막혀 있어 여기서 실행할 수 없습니다.)

사전 준비:
1. supabase_news_sentences_schema.sql을 Supabase SQL Editor에서 먼저 실행 (테이블 생성)
2. .env에 EXA_API_KEY / OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
   네 개가 이미 있어야 함 (phrase_bank_builder.py와 동일한 키를 그대로 씁니다)
3. pip install -r requirements.txt

실행: python3 news_sentence_builder.py
"""

import os
import re
import json
import time
import requests
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

# src/App.tsx의 TOPIC_TO_BANK가 가리키는 3개 상위 카테고리.
# 온보딩에서 고른 세부 업종(IT/소프트웨어, 마케팅/세일즈 등) 12개가 전부 이 3개 중
# 하나로 모이기 때문에, 수집은 세부 업종이 아니라 이 3개 단위로 합니다.
TOPIC_QUERIES = {
    "비즈니스/IT 트렌드": "latest technology and business strategy news today",
    "일상 및 오피스 회화": "workplace culture and office trends news article today",
    "최신 시사 및 뉴스": "today's top business and finance news",
}

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
아래에 오늘자 실제 뉴스/기사에서 가져온 텍스트 조각들이 주어집니다. 이 안에서
직장인이 학습하기 좋은 영어 문장을 정확히 3개 뽑아주세요 (난이도를 섞어서:
왕초보/기초 회화/중상급 중 다양하게).

중요한 규칙:
- 텍스트에 실제로 없는 문장을 지어내지 마세요. 원문 그대로 가져오거나 아주 약간만
  다듬은 것이어야 합니다.
- level은 반드시 {LEVELS} 중 하나.
- tone은 반드시 {TONES} 중 하나.
- grammarKeys는 최대 2개, 반드시 아래 목록 중에서만 고르세요 (없으면 빈 배열):
  {GRAMMAR_KEYS}
- vocab은 문장에 실제로 등장하는 핵심 단어 최대 3개: word, meaning(한글), note(짧은 설명).
- score는 1~5점 (학습 콘텐츠로서의 품질/자연스러움). 후하게 주지 마세요.
- 적합한 문장이 없으면 빈 리스트를 반환하세요.

각 항목은 다음 JSON 스키마:
{{
  "text": "영어 문장",
  "translation": "한글 번역",
  "level": "...",
  "tone": "...",
  "situations": ["한글 상황 태그 최대 2개"],
  "grammarKeys": ["..."],
  "vocab": [{{"word": "...", "meaning": "...", "note": "..."}}],
  "score": 1~5,
  "reason": "점수 이유 한 줄 (한글)"
}}

반드시 {{"items": [...]}} 형태의 JSON 객체 하나로만 응답하세요."""

VERIFIER_MODEL = "gpt-4o"
VERIFIER_SYSTEM_PROMPT = """당신은 영어 학습 콘텐츠를 검수하는 매우 엄격한 원어민 에디터입니다.
주어진 영어 문장과 한글 번역이, 실제 학습 앱에 그대로 노출해도 괜찮은 품질인지
독립적으로 판단하세요. 다른 사람이 이미 점수를 매겼을 수 있지만 모르는 상태로
처음부터 다시 평가한다고 생각하세요.

반드시 낮은 점수를 주어야 하는 경우:
- 영어 문장이 어색하거나 문법이 부자연스러움
- 한글 번역이 부정확하거나 뉘앙스가 다름
- 문장이 너무 짧거나(5단어 미만) 맥락 없이는 이해하기 어려움
- 특정 인물의 명예를 훼손하거나 민감한 정치적 주장을 사실인 것처럼 단정하는 문장

JSON으로만 응답하세요:
{"score": 1~5 정수, "translation_ok": true 또는 false, "reason": "한 줄 이유(한글)"}"""


def exa_search(query: str, num_results: int = 3) -> list[dict]:
    resp = requests.post(
        "https://api.exa.ai/search",
        headers={"x-api-key": EXA_API_KEY, "Content-Type": "application/json"},
        json={
            "query": query,
            "numResults": num_results,
            "category": "news",
            "contents": {"text": {"maxCharacters": 1500}},
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def extract_with_gpt(snippets: list[dict]) -> list[dict]:
    combined = "\n\n---\n\n".join(
        f"[출처: {s.get('url', '알 수 없음')}]\n{s.get('text', '')}" for s in snippets
    )
    if not combined.strip():
        return []
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": combined},
        ],
    )
    try:
        return json.loads(response.choices[0].message.content).get("items", [])
    except Exception as e:
        print(f"  ⚠️ GPT 응답 파싱 실패: {e}")
        return []


def verify_independently(english: str, translation: str) -> dict:
    try:
        response = client.chat.completions.create(
            model=VERIFIER_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": VERIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": f'영어: "{english}"\n한글 번역: "{translation}"'},
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  ⚠️ 2차 검수 실패(안전하게 보류 처리): {e}")
        return {"score": 0, "translation_ok": False, "reason": f"2차 검수 호출 실패: {e}"}


def main():
    APPROVE_THRESHOLD = 4
    total_inserted = 0
    total_approved = 0

    for topic, query in TOPIC_QUERIES.items():
        print(f"\n=== {topic} ===")
        print(f"  🔎 Exa 검색: {query}")
        try:
            results = exa_search(query)
        except Exception as e:
            print(f"  ❌ Exa 검색 실패: {e}")
            continue
        print(f"  → {len(results)}개 소스 발견")

        print("  🤖 GPT로 문장 추출 + 1차 채점 중...")
        items = extract_with_gpt(results)
        print(f"  → 후보 {len(items)}개")

        for item in items:
            text = item.get("text", "")
            translation = item.get("translation", "")
            score1 = item.get("score", 0)
            level = item.get("level") if item.get("level") in LEVELS else LEVELS[1]
            tone = item.get("tone") if item.get("tone") in TONES else TONES[1]
            grammar_keys = detect_grammar_keys(text, item.get("grammarKeys"))

            if len(text.split()) < 5:
                status, combined_score = "rejected", 0
                reason = "1차 기계 필터 거부: 문장이 너무 짧음 (5단어 미만)"
                icon = "🚫"
            else:
                v = verify_independently(text, translation)
                score2 = v.get("score", 0)
                combined_score = min(score1, score2)
                if not v.get("translation_ok", True):
                    status = "rejected"
                    reason = f"2차 검수 거부(번역 부정확): {v.get('reason', '')}"
                elif score1 >= APPROVE_THRESHOLD and score2 >= APPROVE_THRESHOLD:
                    status = "approved"
                    reason = f"1차 {score1}점 / 2차(다른 모델) {score2}점: {v.get('reason', '')}"
                else:
                    status = "pending_review"
                    reason = f"1차 {score1}점 / 2차(다른 모델) {score2}점 — 사람 확인 필요: {v.get('reason', '')}"
                icon = "✅" if status == "approved" else ("🚫" if status == "rejected" else "🟡")

            row = {
                "topic": topic,
                "level": level,
                "tone": tone,
                "situations": item.get("situations") or [],
                "text": text,
                "translation": translation,
                "grammar_keys": grammar_keys,
                "vocab": item.get("vocab") or [],
                "native_alternatives": [],
                "source_url": results[0].get("url") if results else None,
                "verified_score": combined_score,
                "verified_reason": reason,
                "status": status,
            }
            try:
                supabase.table("hook_news_sentences").insert(row).execute()
                total_inserted += 1
                if status == "approved":
                    total_approved += 1
                print(f"  {icon} [{status}] ({combined_score}점) {text!r}")
            except Exception as e:
                print(f"  ❌ 저장 실패: {e}")

        time.sleep(1)

    print(f"\n총 {total_inserted}개 저장 (그중 {total_approved}개 자동 승인).")
    print("Supabase 대시보드 → Table Editor → hook_news_sentences 에서 결과를 확인하세요.")
    print("status='pending_review'인 항목은 사람이 한 번 더 보고 approved/rejected로 바꿔주는 걸 권장합니다.")


if __name__ == "__main__":
    main()
