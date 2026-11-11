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
# 앱의 모든 문법 유형을 수집합니다. 매주 검색어가 바뀌어 새 표현이 계속 쌓입니다.
GRAMMAR_TAXONOMY = {
    "politeRequest": {
        "label": "정중한 요청 (Could / Would you)",
        "queries": [
            "polite ways native English speakers ask coworkers for something in business email",
            "how to politely ask a colleague for a favor at work in English with examples",
        ],
    },
    "idiomaticExpression": {
        "label": "관용 표현 (Idiom)",
        "queries": [
            "common business idioms native English speakers use in meetings with examples",
            "modern workplace slang and idioms used in American offices",
        ],
    },
    "concessiveContrast": {
        "label": "대조·양보 (but / although)",
        "queries": [
            "how to politely push back or disagree in a business meeting in English examples",
            "diplomatic ways to express a different opinion at work in English",
        ],
    },
    "modalSuggestion": {
        "label": "제안·권고 (should / might want to)",
        "queries": [
            "soft ways to suggest something to your team in English business examples",
            "how to give advice to a colleague politely in English at work",
        ],
    },
    "nearFuture": {
        "label": "가까운 미래 (be going to)",
        "queries": [
            "how to talk about upcoming plans and next steps at work in English examples",
            "project update phrases about what we are going to do next in English",
        ],
    },
    "reportedSpeech": {
        "label": "간접 인용 (said that ~)",
        "queries": [
            "how to report what someone said in a business meeting in English examples",
            "summarizing a conversation with a client in English email examples",
        ],
    },
    "phrasalVerb": {
        "label": "구동사 (Phrasal Verb)",
        "queries": [
            "most common phrasal verbs used in business English meetings with example sentences",
            "workplace phrasal verbs native speakers use every day examples",
        ],
    },
    "conditionalPossibility": {
        "label": "가능성 표현 (could / may / might)",
        "queries": [
            "how to express possibility and uncertainty in business English examples",
            "hedging language could might may in professional emails examples",
        ],
    },
    "presentProgressive": {
        "label": "현재진행 (be + -ing)",
        "queries": [
            "how to describe what you are currently working on in English status update examples",
            "present continuous in business English meetings and standups examples",
        ],
    },
    "quantifier": {
        "label": "수량 표현 (a lot of / plenty of)",
        "queries": [
            "ways to talk about amounts and quantities in business English examples",
            "natural ways to say many or much in professional English examples",
        ],
    },
    "letMeStructure": {
        "label": "완곡한 의지 표명 (Let me ~)",
        "queries": [
            "let me phrases native speakers use at work to offer help or take action",
            "polite ways to offer to do something for a colleague in English examples",
        ],
    },
}

# 매주 다른 검색어를 쓰도록 돌려서, 같은 글만 계속 모으지 않고 요즘 표현을 계속 넓혀 갑니다.
def pick_query(info: dict) -> str:
    qs = info["queries"]
    week = int(time.time() // (7 * 86400))
    return qs[week % len(qs)]


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
    "presentProgressive": r"\b(am|is|are|'m|'re)\s+\w+ing\b",
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
- 회사·업무 상황(회의, 이메일, 협상, 보고, 동료·고객과의 대화)에서 쓰이지 않는 일상 문장
  (예: 쇼핑, 미용실, 주말 약속, 날씨 같은 사적인 대화)
- 기사나 책의 본문처럼 길고 설명적인 문장이라, 앞뒤 글 없이는 표현으로 쓰기 어려운 경우
  (한 문장이 22단어를 넘거나, 글쓴이의 서술·논평인 경우)
- 문장 조각, 말줄임표나 슬래시(/)가 섞인 미완성 표현
- "{label}" 패턴이 문장에 실제로 나타나지 않는 경우

JSON으로만 응답하세요:
{{"score": 1~5 정수, "is_meta_sentence": true 또는 false,
  "is_workplace": 업무 상황에서 쓰는 표현이면 true,
  "is_standalone": 앞뒤 글 없이 그대로 외워 쓸 수 있는 짧은 완성 표현이면 true,
  "reason": "한 줄 이유(한글)"}}"""

RUBRIC_SYSTEM_PROMPT = """당신은 비즈니스 영어 콘텐츠를 검수하는 깐깐한 원어민 에디터입니다.
아래에 실제 웹에서 가져온 텍스트 조각들이 주어집니다. 이 조각들 "안에 실제로 등장하는"
문장 중에서, "{label}" 문법/표현 패턴을 보여주는 좋은 예문을 최대 3개 뽑으세요.

중요한 규칙:
- 텍스트에 실제로 없는 문장을 지어내지 마세요. 반드시 원문에서 그대로 가져오거나,
  원문 문장을 아주 약간만 다듬은 것이어야 합니다.
- 각 예문에 대해 1~5점 루브릭 점수를 매기세요: 5 = 원어민이 실제 비즈니스 상황에서
  자연스럽게 쓸 법함, 3 = 문법은 맞지만 어색하거나 일반적, 1 = 부자연스럽거나 이 패턴과
  무관함. 점수를 후하게 주지 말고, 애매하면 낮게 주세요.
- 회사·업무 상황(회의, 이메일, 협상, 보고, 동료·고객과의 대화)에서 쓰는 표현만 뽑으세요.
  쇼핑, 미용실, 날씨 같은 일상·사적인 대화는 뽑지 마세요.
- 앞뒤 글 없이 그대로 외워 쓸 수 있는 짧은 완성 표현(보통 3~20단어)만 뽑으세요.
  기사 본문 같은 긴 설명문, 문장 조각, 말줄임표나 슬래시(/)가 섞인 문장은 뽑지 마세요.
- 적합한 문장이 하나도 없으면 빈 리스트를 반환하세요. 억지로 채우지 마세요.

각 항목은 다음 JSON 스키마를 따르세요:
{{
  "english": "원문에서 가져온 예문",
  "korean_meaning": "한글 뜻",
  "tone": "formal | neutral | casual 중 하나",
  "situation": "이 표현을 쓸 만한 상황 (한글, 예: 이메일 회신, 화상회의)",
  "situation_tag": "다음 4개 중 가장 가까운 것 하나: 외국인 동료와 일상 대화 | 화상회의 및 발표 | 이메일 및 문서 | 해외 출장 및 여행",
  "grammar_key": "다음 중 가장 가까운 것 하나: {keys} (맞는 게 없으면 idiomaticExpression)",
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
            # 요즘 표현을 모으기 위해 최근 약 2년 안의 글을 우선합니다.
            "startPublishedDate": time.strftime("%Y-%m-%dT00:00:00.000Z", time.gmtime(time.time() - 730 * 86400)),
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
            {"role": "system", "content": RUBRIC_SYSTEM_PROMPT.format(label=label, keys=", ".join(GRAMMAR_TAXONOMY.keys()))},
            {"role": "user", "content": combined},
        ],
    )
    try:
        parsed = json.loads(response.choices[0].message.content)
        return parsed.get("items", [])
    except Exception as e:
        print(f"  ⚠️ GPT 응답 파싱 실패: {e}")
        return []


def find_source_url(english: str, results: list[dict]):
    """예문이 실제로 들어 있는 글의 주소를 찾습니다. 못 찾으면 None(엉뚱한 출처를 붙이지 않음)."""
    needle = re.sub(r"\s+", " ", english).strip().lower()[:45]
    if not needle:
        return None
    for r in results:
        text = re.sub(r"\s+", " ", r.get("text", "") or "").lower()
        if needle in text:
            return r.get("url")
    return None


def keyword_filter_ok(grammar_key: str, english: str) -> bool:
    pattern = KEYWORD_FILTERS.get(grammar_key)
    if not pattern:
        return True  # 이 카테고리는 기계 필터가 없음 → 2차 검수에만 맡김
    return bool(re.search(pattern, english, re.IGNORECASE))


def verify_independently(label: str, english: str, situation_mode: bool = False, fresh_mode: bool = False) -> dict:
    """1차 추출과 다른 모델(gpt-4o)로 독립 재채점. 실패하면 보수적으로 낮은 점수 반환."""
    prompt = VERIFIER_SYSTEM_PROMPT.format(label=label)
    if situation_mode or fresh_mode:
        # 상황별·최신 수집은 특정 문법 패턴이 아니라 "실제로 쓰는 업무 표현인가"만 봅니다.
        prompt = prompt.replace(
            f'- "{label}" 패턴이 문장에 실제로 나타나지 않는 경우',
            "- 업무 상황에서 실제로 자주 쓰는 자연스러운 표현이 아닌 경우(어색하거나 교과서적인 경우)",
        )
    if fresh_mode:
        # 최신 표현은 짧은 구(예: "double down on")도 허용하고, 회사·사람 이름이 박힌 문장은 거부합니다.
        prompt = prompt.replace(
            "- 문장 조각, 말줄임표나 슬래시(/)가 섞인 미완성 표현",
            "- 말줄임표나 슬래시(/)가 섞인 미완성 표현 (2~10단어의 짧은 관용구·구 단위 표현은 허용)\n"
            "- 특정 회사·사람·제품 이름이나 수치가 들어 있어 다른 상황에 못 쓰는 문장",
        ).replace(
            "앞뒤 글 없이 그대로 외워 쓸 수 있는 짧은 완성 표현이면 true",
            "앞뒤 글 없이 그대로 외워 쓸 수 있는 짧은 표현(구 단위 포함)이면 true",
        )
    try:
        response = client.chat.completions.create(
            model=VERIFIER_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f'예문: "{english}"'},
            ],
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  ⚠️ 2차 검수 실패(안전하게 보류 처리): {e}")
        return {"score": 0, "is_meta_sentence": False, "reason": f"2차 검수 호출 실패: {e}"}


# ---- 최신 표현 수집: 최근 45일의 실제 업무 뉴스(경영진 발언·사내 공지·실적 발표 등)에서 "요즘 쓰는 말"을 뽑습니다.
FRESH_DAYS = 45
FRESH_PER_RUN = 3  # 하루에 최신 검색 3개
FRESH_QUERIES = [
    "CEO memo to employees announces new strategy AI restructuring quotes",
    "earnings call CFO said we are focused on priorities for next quarter",
    "analyst question earnings call management responded we continue to see",
    "executive says in interview about how teams work with AI at the office",
    "new corporate buzzwords and workplace jargon everyone is using this year",
    "return to office mandate managers told employees memo said",
    "startup founder says about launching product customers feedback quotes",
    "company announces reorganization layoffs memo says we are streamlining",
    "manager advice how leaders communicate with their teams this year says",
    "business leaders explain how they handle tough negotiations and deadlines says",
]

FRESH_RUBRIC_PROMPT = """당신은 비즈니스 영어 콘텐츠를 검수하는 깐깐한 원어민 에디터입니다.
아래는 최근 몇 주 안에 나온 실제 비즈니스 뉴스 조각들입니다. 이 조각들 "안에 실제로 등장하는" 표현 중에서,
한국 직장인이 지금 회의·이메일·대화에서 그대로 써볼 만한 "요즘 쓰는 비즈니스 표현"을 최대 3개 뽑으세요.

규칙:
- 텍스트에 실제로 있는 표현만 뽑으세요. 지어내지 마세요. 원문에서 그대로 가져오거나 아주 약간만 다듬으세요.
- 2~12단어의 짧은 표현(관용구, 업계 유행어, 자주 쓰는 문장 틀, 또는 짧은 완성 문장)만 뽑으세요.
- 특정 회사·사람·제품 이름, 숫자, 날짜가 들어간 문장은 뽑지 마세요. 다른 상황에서도 쓸 수 있어야 합니다.
- 너무 흔하고 오래된 표현(예: "Thank you", "Best regards", "Let me know")은 뽑지 마세요. "요즘 이런 말을 쓰는구나" 싶은 표현을 우선하세요.
- 기사 기자가 쓴 설명문이 아니라, 사람들이 실제로 말하거나 쓰는 표현이어야 합니다.
- 적합한 표현이 없으면 빈 리스트를 반환하세요. 억지로 채우지 마세요.

각 항목은 다음 JSON 스키마를 따르세요:
{{
  "english": "원문에서 가져온 표현",
  "korean_meaning": "한글 뜻",
  "tone": "formal | neutral | casual 중 하나",
  "situation": "이 표현을 쓸 만한 상황 (한글)",
  "situation_tag": "다음 4개 중 가장 가까운 것 하나: 외국인 동료와 일상 대화 | 화상회의 및 발표 | 이메일 및 문서 | 해외 출장 및 여행",
  "grammar_key": "다음 중 가장 가까운 것 하나: {keys} (맞는 게 없으면 idiomaticExpression)",
  "note": "왜 요즘 쓰는 표현인지, 어떤 맥락에서 쓰는지 한 줄 (한글)",
  "score": 1~5 정수,
  "reason": "이 점수를 준 이유 한 줄 (한글)"
}}

반드시 {{"items": [...]}} 형태의 JSON 객체 하나로만 응답하세요."""


def exa_search_fresh(query: str, num_results: int = 5) -> list[dict]:
    resp = requests.post(
        "https://api.exa.ai/search",
        headers={"x-api-key": EXA_API_KEY, "Content-Type": "application/json"},
        json={
            "query": query,
            "numResults": num_results,
            "category": "news",
            "contents": {"text": {"maxCharacters": 1800}},
            "startPublishedDate": time.strftime("%Y-%m-%dT00:00:00.000Z", time.gmtime(time.time() - FRESH_DAYS * 86400)),
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def extract_fresh_with_gpt(snippets: list[dict]) -> list[dict]:
    combined = "\n\n---\n\n".join(
        f"[출처: {s.get('url', '알 수 없음')} / 게시일: {s.get('publishedDate', '알 수 없음')}]\n{s.get('text', '')}" for s in snippets
    )
    if not combined.strip():
        return []
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": FRESH_RUBRIC_PROMPT.format(keys=", ".join(GRAMMAR_TAXONOMY.keys()))},
            {"role": "user", "content": combined},
        ],
    )
    try:
        return json.loads(response.choices[0].message.content).get("items", [])
    except Exception as e:
        print(f"  ⚠️ GPT 응답 파싱 실패: {e}")
        return []


def find_source_result(english: str, results: list[dict]):
    """예문이 실제로 들어 있는 글(결과 1건)을 찾습니다. 못 찾으면 None."""
    needle = re.sub(r"\s+", " ", english).strip().lower()[:45]
    if not needle:
        return None
    for r in results:
        text = re.sub(r"\s+", " ", r.get("text", "") or "").lower()
        if needle in text:
            return r
    return None


# 업무 상황별 수집 (앱 설문의 "주로 쓰는 상황" 4가지와 같은 이름). 매일 상황마다 검색어 1개씩 돌립니다.
SITUATION_TAXONOMY = {
    "화상회의 및 발표": [
        "phrases to use in virtual meetings and presentations in business English with examples",
        "how to interrupt politely, ask for clarification and wrap up in a meeting in English examples",
        "business English phrases for giving updates and presenting results examples",
        "how to disagree or ask questions in a video call at work in English examples",
    ],
    "이메일 및 문서": [
        "professional email phrases native speakers use to follow up, reply and close an email examples",
        "how to write a polite reminder or request in a business email in English examples",
        "business email opening and closing lines native English speakers actually use",
        "how to apologize for a delay or decline politely in a work email in English examples",
    ],
    "외국인 동료와 일상 대화": [
        "small talk phrases with coworkers at the office in English examples",
        "how to chat with colleagues at lunch or in the elevator in English natural phrases",
        "friendly workplace conversation phrases for checking in on a teammate in English",
        "natural ways to make plans, offer help and say thanks to coworkers in English examples",
    ],
    "해외 출장 및 여행": [
        "business trip English phrases for airports, hotels and meeting clients examples",
        "how to introduce yourself and make conversation at a conference or client dinner in English",
        "phrases for scheduling meetings and confirming travel plans with overseas partners in English",
        "networking phrases at business events in English examples",
    ],
}
SITUATION_TAGS = list(SITUATION_TAXONOMY.keys())

GRAMMAR_PER_RUN = 4  # 하루에 문법 유형 4개씩 돌려가며 수집 (11개 유형이 약 3일에 한 바퀴)
MAX_VERIFY_PER_RUN = 40  # 하루 2차 검수(gpt-4o) 호출 상한 — 비용 안전장치


def todays_grammar_keys(day: int) -> list[str]:
    keys = list(GRAMMAR_TAXONOMY.keys())
    if os.getenv("PHRASE_RUN_ALL") == "1":
        return keys
    start = (day * GRAMMAR_PER_RUN) % len(keys)
    return [keys[(start + i) % len(keys)] for i in range(GRAMMAR_PER_RUN)]


def load_existing_english() -> set:
    seen: set = set()
    page = 0
    while True:
        try:
            rows = supabase.table("hook_phrase_bank").select("english").range(page * 1000, page * 1000 + 999).execute().data
        except Exception:
            break
        for r in rows:
            seen.add(r["english"].strip().lower())
        if len(rows) < 1000:
            break
        page += 1
    return seen


OPTIONAL_COLUMNS = ("situation_tag", "source_published_at")


def insert_row(row: dict) -> None:
    try:
        supabase.table("hook_phrase_bank").insert(row).execute()
    except Exception as e:
        # 아직 마이그레이션 전이라 일부 컬럼이 없다면, 그 컬럼 없이 다시 저장합니다.
        msg = str(e)
        strip = [c for c in OPTIONAL_COLUMNS if c in msg and c in row]
        if strip:
            supabase.table("hook_phrase_bank").insert({k: v for k, v in row.items() if k not in strip}).execute()
        else:
            raise


def main():
    APPROVE_THRESHOLD = 5  # 이 점수 이상만 자동 승인(approved), 나머지는 사람이 검토(pending_review)
    MAX_WORDS = 22  # 이보다 긴 문장은 기사 본문일 가능성이 높아 바로 거부
    total_inserted = 0
    total_approved = 0
    verify_calls = 0
    day = int(time.time() // 86400)
    seen = load_existing_english()
    print(f"현재 표현 뱅크에 저장된 표현: {len(seen)}개")

    # 작업 목록: (kind, key, label, query, fixed_situation)
    jobs = []
    for gk in todays_grammar_keys(day):
        info = GRAMMAR_TAXONOMY[gk]
        qs = info["queries"]
        jobs.append(("grammar", gk, info["label"], qs[(day // 3) % len(qs)], None))
    for tag, qs in SITUATION_TAXONOMY.items():
        jobs.append(("situation", tag, f"비즈니스 실용 표현 (상황: {tag})", qs[day % len(qs)], tag))
    for i in range(FRESH_PER_RUN):
        q = FRESH_QUERIES[(day * FRESH_PER_RUN + i) % len(FRESH_QUERIES)]
        jobs.insert(i * 2, ("fresh", f"fresh-{i + 1}", "최신 비즈니스 표현", q, None))  # 앞쪽에 섞어 넣어 상한에 걸려도 최신 수집이 먼저 돕니다

    for kind, key, label, query, fixed_situation in jobs:
        print(f"\n=== [{kind}] {key} ===")
        if verify_calls >= MAX_VERIFY_PER_RUN:
            print("  ⏹️ 오늘 검수 호출 상한에 도달해 나머지는 다음에 합니다.")
            break
        print(f"  🔎 Exa 검색: {query}")
        try:
            results = exa_search_fresh(query, 5) if kind == "fresh" else exa_search(query, 4 if kind == "situation" else 3)
        except Exception as e:
            print(f"  ❌ Exa 검색 실패: {e}")
            continue
        print(f"  → {len(results)}개 소스 발견")

        print("  🤖 GPT로 예문 추출 + 채점 중...")
        items = extract_fresh_with_gpt(results) if kind == "fresh" else extract_with_gpt(label, results)
        print(f"  → 후보 {len(items)}개")

        for item in items:
            english = item.get("english", "")
            score1 = item.get("score", 0)
            if not english or english.strip().lower() in seen:
                print(f"  ⏭️ 이미 있음/빈 문장: {english!r}")
                continue
            seen.add(english.strip().lower())

            if kind == "grammar":
                grammar_key = key
            else:
                gk = item.get("grammar_key")
                grammar_key = gk if gk in GRAMMAR_TAXONOMY else "idiomaticExpression"
            tag = fixed_situation or item.get("situation_tag")
            if tag not in SITUATION_TAGS:
                tag = None

            n_words = len(english.split())
            if n_words > MAX_WORDS or n_words < 2 or "/" in english or "…" in english or "..." in english:
                status = "rejected"
                combined_score = 0
                reason = f"기계 필터 거부: 길이({n_words}단어) 또는 미완성 표기(/, …)"
                icon = "🚫"
            elif kind == "grammar" and not keyword_filter_ok(grammar_key, english):
                status = "rejected"
                combined_score = 0
                reason = f"1차 기계 필터 거부: '{label}' 패턴 키워드가 문장에 없음"
                icon = "🚫"
            elif verify_calls >= MAX_VERIFY_PER_RUN:
                status = "pending_review"
                combined_score = score1
                reason = "오늘 2차 검수 상한 초과 — 사람 확인 필요"
                icon = "🟡"
            else:
                verify_calls += 1
                v = verify_independently(label, english, situation_mode=(kind == "situation"), fresh_mode=(kind == "fresh"))
                score2 = v.get("score", 0)
                combined_score = min(score1, score2)  # 보수적으로 둘 중 낮은 점수 채택
                if v.get("is_meta_sentence"):
                    status = "rejected"
                    reason = f"2차 검수 거부(메타 문장): {v.get('reason', '')}"
                elif v.get("is_workplace") is False or v.get("is_standalone") is False:
                    status = "rejected"
                    reason = f"2차 검수 거부(업무 무관 또는 독립 표현 아님): {v.get('reason', '')}"
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
                "situation_tag": tag,
                "note": item.get("note", ""),
                "source_url": (src.get("url") if (src := find_source_result(english, results)) else None),
                "source_published_at": (src.get("publishedDate") if src else None) if kind == "fresh" else None,
                "source_type": "collector_fresh" if kind == "fresh" else "collector",
                "verified_score": combined_score,
                "verified_reason": reason,
                "status": status,
            }
            try:
                insert_row(row)
                total_inserted += 1
                if status == "approved":
                    total_approved += 1
                print(f"  {icon} [{status}] ({combined_score}점) {english!r}")
            except Exception as e:
                print(f"  ❌ 저장 실패: {e}")

        time.sleep(1)  # API rate limit 여유

    print(f"\n총 {total_inserted}개 저장 (그중 {total_approved}개 자동 승인). 2차 검수 호출 {verify_calls}회.")
    print("status='pending_review'인 항목은 앱의 '표현 검수' 화면(관리자)에서 승인/반려할 수 있습니다.")


if __name__ == "__main__":
    main()
