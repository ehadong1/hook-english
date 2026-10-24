"""
표현 뱅크(phrase bank) 수집 스크립트.

Exa로 실제 원어민이 쓴 비즈니스 영어 글(기사/가이드/포럼 등)을 검색하고,
GPT-4o-mini로 그 안에서 검증 가능한 예문을 추출 + 1차 루브릭 채점한 뒤,
아래 2단계 검수를 거쳐 Supabase의 hook_phrase_bank 테이블에 저장합니다.

1) 기계 키워드 필터: grammar_key가 실제로 그 문법 패턴(예: but/although)을
   포함하는지 정규식으로 확인 — 명백한 카테고리 오분류를 값싸게 제거.
2) 독립 2차 검수: 1차와 다른 모델(gpt-4o)이 점수를 모르는 채로 처음부터
   다시 채점 — 같은 모델이 자기 결과를 후하게 평가하는 self-enhancement
   bias를 줄이고, "규칙을 설명만 하는 메타 문장"도 걸러냄.

1차/2차 점수가 둘 다 기준 이상이면 approved, 기계 필터에서 걸리거나 메타
문장으로 판정되면 rejected, 그 외(점수가 애매하거나 엇갈리면)는
pending_review로 남겨 사람이 검토하도록 합니다.

이 스크립트는 사용자의 실제 컴퓨터 터미널에서 실행해야 합니다.
(Claude의 샌드박스는 Exa API로 나가는 외부 네트워크 요청이 막혀 있어 여기서 실행할 수 없습니다.)

사전 준비:
1. supabase_phrase_bank_schema.sql을 Supabase SQL Editor에서 먼저 실행 (테이블 생성)
2. .env에 SUPABASE_SERVICE_ROLE_KEY 추가
   (Supabase 대시보드 → Settings → API Keys → "Legacy anon, service_role API keys" 탭 →
    service_role 시크릿 키 복사. 이 키는 절대 VITE_ 접두사 붙이거나 프론트엔드/브라우저
    코드에 넣지 마세요 — 서버/CLI 전용입니다.)
3. pip install requests openai supabase python-dotenv --break-system-packages

실행: python3 phrase_bank_builder.py
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

# App.tsx의 GRAMMAR_LIBRARY 키와 반드시 동일해야, 나중에 앱에서 그대로 재사용 가능합니다.
# 우선 파일럿으로 4개만 테스트합니다. 결과 품질 보고 나머지 키도 추가하면 됩니다.
GRAMMAR_TAXONOMY = {
    "politeRequest": {
        "label": "정중한 요청 (Could / Would you)",
        "query": "polite ways native English speakers ask coworkers for something in business email",
    },
    "idiomaticExpression": {
        "label": "관용 표현 (Idiom)",
        "query": "common business idioms native English speakers use in meetings with examples",
    },
    "concessiveContrast": {
        "label": "대조·양보 (but / although)",
        "query": "how to politely push back or disagree in a business meeting in English examples",
    },
    "modalSuggestion": {
        "label": "제안·권고 (should / might want to)",
        "query": "soft ways to suggest something to your team in English business examples",
    },
}

# 1차 기계 필터: grammar_key가 실제로 그 문법 패턴을 담고 있는지 정규식으로 확인합니다.
# GPT가 카테고리를 잘못 배정하는 "명백한 오분류"를 GPT 채점 전에 값싸게 걸러냅니다.
# 여기 없는 키(idiomaticExpression 등 관용구처럼 특정 단어로 못 잡는 것)는 2차 검수에만 맡깁니다.
KEYWORD_FILTERS = {
    "politeRequest": r"\b(could you|can you|would you|would you mind)\b",
    "nearFuture": r"\b(going to|gonna)\b",
    "reportedSpeech": r"\b(said|told|mentioned|noted|flagged)\b",
    "modalSuggestion": r"\b(should|might want to)\b",
    "conditionalPossibility": r"\b(could|might|may)\b",
    "quantifier": r"\b(a lot of|plenty of|tons of)\b",
    "letMeStructure": r"\blet me\b",
    "concessiveContrast": r"\b(but|although|though)\b",
}

# 2차 독립 검수용. 1차 추출/채점과 "다른" 모델을 써서, 같은 모델이 자기 결과를
# 후하게 채점하는 self-enhancement bias를 줄입니다. 1차 점수는 알려주지 않고
# 처음부터 다시 판단하게 합니다.
VERIFIER_MODEL = "gpt-4o"
VERIFIER_SYSTEM_PROMPT = """당신은 비즈니스 영어 콘텐츠를 검수하는 매우 엄격한 원어민 에디터입니다.
주어진 예문 하나가 "{label}" 패턴을 실제로 자연스럽게 보여주는 살아있는 예문인지
독립적으로, 처음부터 다시 판단하세요. 다른 사람이 이미 점수를 매겼을 수 있지만
그 점수는 모르는 상태로 평가한다고 생각하세요.

반드시 낮은 점수를 주거나 거부해야 하는 경우:
- 문법 규칙 자체를 "설명"하는 메타 문장인 경우
  (예: "You should, you need to, and you have to are all acceptable." 처럼
   규칙을 나열/설명만 하고 실제 상황에서 쓰이는 문장이 아닌 경우)
- 실제 이메일/회의/대화에서 쓰일 법하지 않은 문장
- "{label}" 패턴이 문장에 실제로 나타나지 않는 경우

JSON으로만 응답하세요:
{{"score": 1~5 정수, "is_meta_sentence": true 또는 false, "reason": "한 줄 이유(한글)"}}"""

RUBRIC_SYSTEM_PROMPT = """당신은 비즈니스 영어 콘텐츠를 검수하는 깐깐한 원어민 에디터입니다.
아래에 실제 웹에서 가져온 텍스트 조각들이 주어집니다. 이 조각들 "안에 실제로 등장하는"
문장 중에서, "{label}" 문법/표현 패턴을 보여주는 좋은 예문을 최대 3개 뽑으세요.

중요한 규칙:
- 텍스트에 실제로 없는 문장을 지어내지 마세요. 반드시 원문에서 그대로 가져오거나,
  원문 문장을 아주 약간만 다듬은 것이어야 합니다.
- 각 예문에 대해 1~5점 루브릭 점수를 매기세요: 5 = 원어민이 실제 비즈니스 상황에서
  자연스럽게 쓸 법함, 3 = 문법은 맞지만 어색하거나 일반적, 1 = 부자연스럽거나 이 패턴과
  무관함. 점수를 후하게 주지 말고, 애매하면 낮게 주세요.
- 적합한 문장이 하나도 없으면 빈 리스트를 반환하세요. 억지로 채우지 마세요.

각 항목은 다음 JSON 스키마를 따르세요:
{{
  "english": "원문에서 가져온 예문",
  "korean_meaning": "한글 뜻",
  "tone": "formal | neutral | casual 중 하나",
  "situation": "이 표현을 쓸 만한 상황 (한글, 예: 이메일 회신, 화상회의)",
  "note": "이 표현이 왜 자연스러운지/언제 쓰는지 한 줄 설명 (한글)",
  "score": 1~5 정수,
  "reason": "이 점수를 준 이유 한 줄 (한글)"
}}

반드시 {{"items": [...]}} 형태의 JSON 객체 하나로만 응답하세요."""


def exa_search(query: str, num_results: int = 3) -> list[dict]:
    resp = requests.post(
        "https://api.exa.ai/search",
        headers={"x-api-key": EXA_API_KEY, "Content-Type": "application/json"},
        json={
            "query": query,
            "numResults": num_results,
            "contents": {"text": {"maxCharacters": 1200}},
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])


def extract_with_gpt(label: str, snippets: list[dict]) -> list[dict]:
    combined = "\n\n---\n\n".join(
        f"[출처: {s.get('url', '알 수 없음')}]\n{s.get('text', '')}" for s in snippets
    )
    if not combined.strip():
        return []

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": RUBRIC_SYSTEM_PROMPT.format(label=label)},
            {"role": "user", "content": combined},
        ],
    )
    try:
        parsed = json.loads(response.choices[0].message.content)
        return parsed.get("items", [])
    except Exception as e:
        print(f"  ⚠️ GPT 응답 파싱 실패: {e}")
        return []


def keyword_filter_ok(grammar_key: str, english: str) -> bool:
    pattern = KEYWORD_FILTERS.get(grammar_key)
    if not pattern:
        return True  # 이 카테고리는 기계 필터가 없음 → 2차 검수에만 맡김
    return bool(re.search(pattern, english, re.IGNORECASE))


def verify_independently(label: str, english: str) -> dict:
    """1차 추출과 다른 모델(gpt-4o)로 독립 재채점. 실패하면 보수적으로 낮은 점수 반환."""
    try:
        response = client.chat.completions.create(
            model=VERIFIER_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": VERIFIER_SYSTEM_PROMPT.format(label=label)},
                {"role": "user", "content": f'예문: "{english}"'},
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  ⚠️ 2차 검수 실패(안전하게 보류 처리): {e}")
        return {"score": 0, "is_meta_sentence": False, "reason": f"2차 검수 호출 실패: {e}"}


def main():
    APPROVE_THRESHOLD = 4  # 이 점수 이상만 자동 승인(approved), 나머지는 사람이 검토(pending_review)
    total_inserted = 0
    total_approved = 0

    for grammar_key, info in GRAMMAR_TAXONOMY.items():
        label = info["label"]
        print(f"\n=== {grammar_key} ({label}) ===")

        print(f"  🔎 Exa 검색: {info['query']}")
        try:
            results = exa_search(info["query"])
        except Exception as e:
            print(f"  ❌ Exa 검색 실패: {e}")
            continue
        print(f"  → {len(results)}개 소스 발견")

        print("  🤖 GPT로 예문 추출 + 채점 중...")
        items = extract_with_gpt(label, results)
        print(f"  → 후보 {len(items)}개")

        for item in items:
            english = item.get("english", "")
            score1 = item.get("score", 0)

            if not keyword_filter_ok(grammar_key, english):
                status = "rejected"
                combined_score = 0
                reason = f"1차 기계 필터 거부: '{label}' 패턴 키워드가 문장에 없음"
                icon = "🚫"
            else:
                v = verify_independently(label, english)
                score2 = v.get("score", 0)
                combined_score = min(score1, score2)  # 보수적으로 둘 중 낮은 점수 채택
                if v.get("is_meta_sentence"):
                    status = "rejected"
                    reason = f"2차 검수 거부(메타 문장): {v.get('reason', '')}"
                elif score1 >= APPROVE_THRESHOLD and score2 >= APPROVE_THRESHOLD:
                    status = "approved"
                    reason = f"1차 {score1}점 / 2차(다른 모델) {score2}점 — 둘 다 통과: {v.get('reason', '')}"
                else:
                    status = "pending_review"
                    reason = f"1차 {score1}점 / 2차(다른 모델) {score2}점 — 사람 확인 필요: {v.get('reason', '')}"
                icon = "✅" if status == "approved" else ("🚫" if status == "rejected" else "🟡")

            row = {
                "grammar_key": grammar_key,
                "english": english,
                "korean_meaning": item.get("korean_meaning", ""),
                "tone": item.get("tone", "neutral"),
                "situation": item.get("situation", ""),
                "note": item.get("note", ""),
                "source_url": results[0].get("url") if results else None,
                "verified_score": combined_score,
                "verified_reason": reason,
                "status": status,
            }
            try:
                supabase.table("hook_phrase_bank").insert(row).execute()
                total_inserted += 1
                if status == "approved":
                    total_approved += 1
                print(f"  {icon} [{status}] ({combined_score}점) {english!r}")
            except Exception as e:
                print(f"  ❌ 저장 실패: {e}")

        time.sleep(1)  # API rate limit 여유

    print(f"\n총 {total_inserted}개 저장 (그중 {total_approved}개 자동 승인).")
    print("Supabase 대시보드 → Table Editor → hook_phrase_bank 에서 결과를 확인하세요.")
    print("status='pending_review'인 항목은 사람이 한 번 더 보고 approved/rejected로 바꿔주는 걸 권장합니다.")


if __name__ == "__main__":
    main()
