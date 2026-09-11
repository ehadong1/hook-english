// Supabase Edge Function: 일기 쓰기 / 문장 만들어 보기 피드백 (GPT-4o-mini)
//
// 사용자가 작성한 영어(또는 한글) 글을 교정하고, 더 자연스러운 버전과
// 문장 구조 설명, 학습 팁을 돌려줍니다. OPENAI_API_KEY는 이 서버 함수
// 안에만 있고 브라우저에는 노출되지 않습니다 (translate 함수와 동일한 시크릿 사용).
//
// 배포: supabase functions deploy writing-feedback --project-ref <PROJECT_ID>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `당신은 한국어가 모국어인 직장인의 "비즈니스 영어 글쓰기"를 첨삭하는 코치입니다.
사용자가 일기(diary) 또는 업무 상황 문장(compose)을 영어 또는 한글로 씁니다. 이를 첨삭해주세요.

규칙:
- 한글로 썼다면 자연스러운 비즈니스 영어로 새로 작성하고, 영어로 썼다면 문법/자연스러움을 교정하세요.
- corrected: 문법적으로 올바르게 다듬은 버전.
- natural: 원어민이 실제로 쓸 법한, 더 자연스럽고 간결한 버전.
- structure: 문장 구조(주어/동사/목적어 등)에 대한 한 줄 평가나 조언을 한국어로.
- tips: 이 사용자의 약점(weaknesses)과 글을 참고해 실질적인 학습 팁 1~3개, 한국어로.
- keywordsUsed: 이 글에서 눈여겨볼 만한 영어 단어/표현 최대 5개 (원문에 실제 등장한 것 위주).
- 반드시 아래 JSON 스키마로만 응답하고, 다른 설명을 덧붙이지 마세요.

{
  "corrected": string,
  "natural": string,
  "structure": string,
  "tips": string[],
  "keywordsUsed": string[]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, profile, mode } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text가 필요합니다." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "서버에 OPENAI_API_KEY 시크릿이 설정되어 있지 않습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weaknesses = (profile?.weaknesses || []).join(", ") || "특별한 약점 없음";
    const level = profile?.level || profile?.levelCode || "중급";
    const modeLabel = mode === "diary" ? "일기 쓰기" : "업무 상황 문장 만들기";

    const userPrompt = `모드: ${modeLabel}\n사용자 영어 수준: ${level}\n사용자 약점: ${weaknesses}\n사용자가 쓴 글:\n"""${text}"""`;

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
      console.error("[writing-feedback] OpenAI 오류:", errText);
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
    console.error("[writing-feedback] 오류:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
