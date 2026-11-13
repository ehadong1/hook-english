"""
표현 뱅크 AI 생성기: 설문(수준 × 업무 분야 × 말투 × 상황)에 맞는 비즈니스 영어 문장을 만들고,
만든 모델과 다른 모델이 독립적으로 검수한 뒤 hook_phrase_bank에 저장합니다.

품질 관문 (모두 통과해야 approved)
1) 기계 검사: 수준별 단어 수 상한, 한글/영어 형식, 중복(이미 저장된 문장과 같은 문장) 제거
2) 독립 2차 검수(gpt-4o, 생성 모델 gpt-4o-mini와 다름): 자연스러움 · 업무 실용성 ·
   수준 적합 · 업무 분야 적합 · 한글 번역 정확도를 1~5점으로 채점
   - 전부 4점 이상 + 수준 판정이 'match' → approved
   - 하나라도 2점 이하 또는 수준이 크게 어긋남 → rejected
   - 그 외 → pending_review (앱의 '표현 검수' 화면에서 사람이 확인)

실행 방식 (환경변수 PHRASE_GEN_MODE)
- bulk : 모든 칸(3수준 × 12분야 × 3말투 × 4상황 = 432칸)을 한 번씩 → 최대 약 2,600문장 후보
- daily: 매일 무작위 24칸 → 약 140문장 후보 (기본)
PHRASE_GEN_PER_CELL(기본 6), PHRASE_GEN_MAX_CELLS(기본 daily 24 / bulk 432)로 조절합니다.
"""
import os
import re
import json
import time
import random
import itertools
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if not all([OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY]):
    raise SystemExit("❌ OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.")

client = OpenAI(api_key=OPENAI_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

GEN_MODEL = "gpt-4o-mini"
VERIFY_MODEL = "gpt-4o"

MODE = os.getenv("PHRASE_GEN_MODE", "daily")
PER_CELL = int(os.getenv("PHRASE_GEN_PER_CELL", "6"))
MAX_CELLS = int(os.getenv("PHRASE_GEN_MAX_CELLS", "432" if MODE == "bulk" else "24"))

BANDS = {
    "왕초보": {"max_words": 9, "guide": "CEFR A1~A2. 아주 쉬운 단어와 짧은 한 문장. 현재형·be동사·can/want to 같은 기본 구조. 어려운 관용구 금지."},
    "기초 회화": {"max_words": 15, "guide": "CEFR A2~B1. 일상 업무에서 바로 쓰는 문장. 정중한 요청(Could you ...), 간단한 이유·시제·조건 표현 가능."},
    "중상급": {"max_words": 22, "guide": "CEFR B1~C1. 자연스러운 관용 표현, 완곡한 거절·제안·협상 표현, 비즈니스 연어 사용 가능."},
}
FIELDS = ["IT/소프트웨어", "제품/PM", "마케팅/세일즈", "재무/회계", "HR/채용", "법무/컴플라이언스",
          "제조/생산/품질", "의료/바이오", "금융/투자", "컨설팅/전략", "디자인/크리에이티브", "경영/임원"]
TONES = {"formal": "정중한 비즈니스", "neutral": "중립 실무", "casual": "캐주얼 친근"}
SITUATIONS = ["외국인 동료와 일상 대화", "화상회의 및 발표", "이메일 및 문서", "해외 출장 및 여행"]
GRAMMAR_KEYS = ["politeRequest", "conditional", "presentPerfect", "passive", "contrast", "reason", "suggestion",
                "modal", "futurePlan", "comparison", "idiomaticExpression"]

SCENARIOS = [
    "asking for a deadline extension", "confirming a meeting time", "giving a status update", "disagreeing politely",
    "asking for clarification", "following up on an earlier email", "introducing yourself or a teammate", "making a suggestion",
    "reporting a problem", "thanking someone for help", "declining a request politely", "negotiating a schedule",
    "asking for feedback", "explaining a delay", "summarizing a decision", "asking someone to repeat or speak slower",
    "small talk before a meeting", "handing over a task", "requesting approval", "sharing an opinion in a meeting",
    "checking if everyone is ready", "apologizing for a mistake", "asking for a document or data", "setting priorities",
    "welcoming a visitor", "booking a room or flight", "closing an email", "wrapping up a meeting",
    "raising a risk or concern", "asking about next steps", "confirming understanding", "offering help",
]

GEN_SYSTEM = """You write natural workplace English sentences for Korean learners.
Return ONLY JSON: {"items":[{"english":"...","korean":"자연스러운 한국어 뜻","note":"이 표현을 쓰는 맥락 한 줄(한국어)","grammar_key":"one of: %s"}]}
Rules:
- Each item is ONE complete, natural sentence a real colleague would say or write at work. No textbook rule explanations.
- Match the requested level strictly (word limit and difficulty). Use the field's real workplace context when natural, otherwise keep it general.
- Vary the scenario and structure; do not repeat the same opening words.
- Korean must be a natural translation, not word-for-word.""" % ", ".join(GRAMMAR_KEYS)

VERIFY_SYSTEM = """You are a strict reviewer of English sentences for a Korean business-English app.
For each item, judge INDEPENDENTLY (you do not know who wrote it). Return ONLY JSON:
{"results":[{"id":0,"naturalness":1-5,"usefulness":1-5,"level_fit":"too_easy|match|too_hard","field_fit":1-5,"korean_accuracy":1-5,"issue":"short Korean note"}]}
Scoring: naturalness = would a native speaker really say/write this? usefulness = would a Korean professional actually use it at work and learn something? field_fit = fits the stated field or is reasonably general (general-purpose sentences should get 4+). korean_accuracy = is the Korean meaning accurate and natural?
Be strict: give 3 or below for stiff, odd, trivial ('This is a pen'-type), or inaccurate items. Level definitions are given per item."""


def chat_json(model: str, system: str, user: str, temperature: float) -> dict:
    for attempt in range(3):
        try:
            r = client.chat.completions.create(
                model=model, temperature=temperature, response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            )
            return json.loads(r.choices[0].message.content or "{}")
        except Exception as e:  # 일시 오류는 재시도
            time.sleep(2 + attempt * 3)
            last = e
    print(f"  ⚠️ {model} 호출 실패: {last}")
    return {}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()


def load_seen() -> set:
    seen, page = set(), 0
    while True:
        rows = supabase.table("hook_phrase_bank").select("english").range(page * 1000, page * 1000 + 999).execute().data
        seen.update(norm(r["english"]) for r in rows)
        if len(rows) < 1000:
            break
        page += 1
    return seen


def machine_ok(item: dict, band: str) -> bool:
    en = str(item.get("english", "")).strip()
    ko = str(item.get("korean", item.get("korean_meaning", ""))).strip()
    words = len(en.split())
    if not en or not ko or words < 2 or words > BANDS[band]["max_words"]:
        return False
    if re.search(r"[가-힣]|/|…|\.\.\.", en) or not re.search(r"[가-힣]", ko):
        return False
    return en[-1] in ".?!"


def run_cell(cell):
    band, field, tone, situation = cell
    scenarios = random.sample(SCENARIOS, PER_CELL)
    user = (
        f"Level: {band} — {BANDS[band]['guide']} (max {BANDS[band]['max_words']} words)\n"
        f"Field: {field}\nTone: {TONES[tone]} ({tone})\nSituation: {situation}\n"
        f"Write {PER_CELL} different sentences, one per scenario: " + "; ".join(scenarios)
    )
    gen = chat_json(GEN_MODEL, GEN_SYSTEM, user, 0.9).get("items", [])
    items = []
    for it in gen:
        it = {**it, "korean": it.get("korean", it.get("korean_meaning", ""))}
        if machine_ok(it, band):
            items.append(it)
    return cell, items


def verify(cell, items):
    band, field, tone, situation = cell
    payload = [{"id": i, "english": it["english"], "korean": it["korean"]} for i, it in enumerate(items)]
    user = (
        f"Claimed level: {band} — {BANDS[band]['guide']} (max {BANDS[band]['max_words']} words)\n"
        f"Claimed field: {field}\nClaimed tone: {TONES[tone]}\nSituation: {situation}\n"
        f"Items: {json.dumps(payload, ensure_ascii=False)}"
    )
    res = chat_json(VERIFY_MODEL, VERIFY_SYSTEM, user, 0).get("results", [])
    return {r.get("id"): r for r in res if isinstance(r, dict)}


def decide(r: dict | None):
    if not r:
        return "pending_review", 0, "2차 검수 응답 없음"
    scores = [r.get("naturalness", 0), r.get("usefulness", 0), r.get("field_fit", 0), r.get("korean_accuracy", 0)]
    level = r.get("level_fit", "")
    low = min(scores)
    avg = round(sum(scores) / len(scores), 2)
    if low <= 2 or (level in ("too_hard", "too_easy") and low <= 3):
        return "rejected", avg, r.get("issue", "")
    if low >= 4 and level == "match":
        return "approved", avg, r.get("issue", "")
    return "pending_review", avg, r.get("issue", "")


def main():
    cells = list(itertools.product(BANDS.keys(), FIELDS, TONES.keys(), SITUATIONS))
    random.shuffle(cells)
    cells = cells[:MAX_CELLS]
    seen = load_seen()
    print(f"모드 {MODE} · 칸 {len(cells)}개 × {PER_CELL}문장 · 기존 표현 {len(seen)}개")

    stats = {"approved": 0, "pending_review": 0, "rejected": 0, "dup": 0, "machine_drop": 0}
    lock_rows = []

    def work(cell):
        cell, items = run_cell(cell)
        if not items:
            return []
        v = verify(cell, items)
        out = []
        for i, it in enumerate(items):
            status, avg, issue = decide(v.get(i))
            out.append((cell, it, status, avg, issue, v.get(i)))
        return out

    with ThreadPoolExecutor(max_workers=4) as ex:
        for batch in ex.map(work, cells):
            for cell, it, status, avg, issue, raw in batch:
                key = norm(it["english"])
                if key in seen:
                    stats["dup"] += 1
                    continue
                seen.add(key)
                band, field, tone, situation = cell
                gk = it.get("grammar_key") if it.get("grammar_key") in GRAMMAR_KEYS else "idiomaticExpression"
                row = {
                    "grammar_key": gk, "english": it["english"].strip(), "korean_meaning": it["korean"].strip(),
                    "tone": tone, "situation": situation, "situation_tag": situation, "note": it.get("note", ""),
                    "source_type": "generated", "level_band": band, "field_tag": field,
                    "verified_score": avg, "verified_reason": f"AI 생성({GEN_MODEL}) → 독립 검수({VERIFY_MODEL}) {avg}점: {issue}",
                    "quality": raw, "status": status,
                }
                try:
                    supabase.table("hook_phrase_bank").insert(row).execute()
                    stats[status] += 1
                except Exception as e:
                    msg = str(e)
                    print(f"  ❌ 저장 실패(v4 SQL을 실행했나요?): {msg[:120]}")
                    raise SystemExit(1)
    print(f"\n완료: 승인 {stats['approved']} · 검토대기 {stats['pending_review']} · 반려 {stats['rejected']} · 중복 {stats['dup']}")
    total = stats["approved"] + stats["pending_review"] + stats["rejected"]
    if total:
        print(f"승인율 {stats['approved'] / total:.0%} (반려·대기는 앱 '표현 검수'에서 확인)")


if __name__ == "__main__":
    main()
