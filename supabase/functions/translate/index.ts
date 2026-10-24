// Supabase Edge Function: 한글 입력 → 실전 비즈니스 영어 변환 (GPT-4o-mini)
//
// 이 함수는 Deno 런타임(Supabase Edge Functions)에서 실행됩니다.
// OPENAI_API_KEY는 브라우저에 절대 노출되지 않고, 이 서버 함수 안에서만 사용됩니다.
//
// 배포 방법 (README.md 참고):
//   supabase functions deploy translate --project-ref <PROJECT_ID>
//   supabase secrets set OPENAI_API_KEY=sk-... --project-ref <PROJECT_ID>

import { corsFor, guard } from "../_shared/guard.ts";

const MAX_TEXT_LENGTH = 300;

// SentenceDissection 화면("구조 및 해설 보기")이 참조하는 문법 라이브러리 키 목록.
// 반드시 이 중에서만 골라야 앱의 기존 문법 설명 카드(GRAMMAR_LIBRARY)와 연결됩니다.
const GRAMMAR_KEYS = [
  "politeRequest", "nearFuture", "reportedSpeech", "phrasalVerb",
  "modalSuggestion", "conditionalPossibility", "presentProgressive",
  "idiomaticExpression", "quantifier", "letMeStructure", "concessiveContrast",
];

const SYSTEM_PROMPT = `당신은 한국어가 모국어인 직장인에게 "실전 비즈니스 영어"를 코치하는 전문가입니다.
사용자가 입력한 한국어 문장을, 실제 원어민 동료/상사에게 자연스럽게 통하는 영어 문장으로 바꿔주세요.

규칙:
- 글자 그대로 직역하지 말고, 실제 비즈니스 상황에서 자주 쓰이는 관용적인 표현으로 바꾸세요.
- tone 값(formal/neutral/casual)에 맞춰 격식 수준을 조절하세요.
- nuance는 한국어로, 왜 이렇게 표현하는지 직역과 무엇이 다른지 1~2문장으로 설명하세요.
- alternatives는 정확히 2개, 원어민들이 실제로 쓰는 대안 표현을 제시하세요. 각각 en(영어 문장), ko(한글 뜻), note(짧은 팁, 한글)를 포함하세요.
- grammarKeys: 최종 english 문장에 실제로 쓰인 문법 패턴을, 아래 목록에 있는 값 중에서만 최대 2개 고르세요. 목록에 맞는 게 전혀 없으면 빈 배열로 두세요.
  선택 가능한 값: ${GRAMMAR_KEYS.join(", ")}
- vocab: english 문장에 실제로 등장하는 핵심 단어/표현 최대 3개. word(원문 그대로의 소문자 단어/구), meaning(한글 뜻), note(이 단어가 어떤 상황에서 쓰이는지 짧은 한글 설명, 통계 수치는 지어내지 말 것).
- 반드시 아래 JSON 스키마로만 응답하고, 다른 설명이나 텍스트를 덧붙이지 마세요.

{
  "english": string,
  "nuance": string,
  "alternatives": [
    { "en": string, "ko": string, "note": string },
    { "en": string, "ko": string, "note": string }
  ],
  "grammarKeys": string[],
  "vocab": [
    { "word": string, "meaning": string, "note": string }
  ]
}`;

Deno.serve(async (req: Request) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 로그인 확인 + 하루 호출 횟수 제한 (통과하면 null)
    const blocked = await guard(req, corsHeaders);
    if (blocked) return blocked;

    const { text, profile } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text가 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `문장은 ${MAX_TEXT_LENGTH}자 이내로 입력해주세요.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "서버에 OPENAI_API_KEY 시크릿이 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toneMap: Record<string, string> = {
      "정중한 비즈니스": "formal",
      "중립 실무": "neutral",
      "캐주얼 친근": "casual",
    };
    const tone = toneMap[profile?.tone as string] || "neutral";
    const level = String(profile?.level || profile?.levelCode || "중급").slice(0, 20);

    const userPrompt = `한국어 문장: "${text}"\ntone: ${tone}\n사용자 영어 수준: ${level}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[translate] OpenAI 오류:", errText);
      return new Response(JSON.stringify({ error: "OpenAI 호출 실패" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("빈 응답");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[translate] 오류:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
