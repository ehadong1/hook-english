import { isSupabaseConfigured } from "./supabaseClient";
import { callLlmTranslate, callLlmWritingFeedback, type TranslateResult, type WritingFeedbackResult } from "./llmProvider";

/* ============================================================================
   SECTION 5. 한글 → 영어 뉘앙스 변환

   직역이 아니라 (1) 의도 (2) 상대와의 거리(격식) (3) 맥락을 반영합니다.
   LLM 프로바이더가 연결되면 그쪽을 우선 사용하고, 없으면 내장 패턴 엔진으로
   동작하며 매칭 실패 시 "정확도 낮음"을 솔직하게 표시합니다.
   ============================================================================ */

type TranslateFn = (text: string, profile: Record<string, any>) => Promise<TranslateResult>;
type FeedbackFn = (text: string, profile: Record<string, any>, mode: string) => Promise<WritingFeedbackResult>;

export let llmProvider: TranslateFn | null = null;
export function setTranslationProvider(fn: TranslateFn) { llmProvider = fn; }

export let writingFeedbackProvider: FeedbackFn | null = null;
export function setWritingFeedbackProvider(fn: FeedbackFn) { writingFeedbackProvider = fn; }

// Supabase가 설정되어 있으면(.env의 VITE_SUPABASE_URL/ANON_KEY) 실제 GPT-4o-mini
// 연결(Supabase Edge Functions "translate", "writing-feedback")을 기본 제공자로 사용합니다.
// 설정되어 있지 않으면 각 provider가 null로 남아 아래 로컬 패턴/폴백 로직만 사용됩니다.
if (isSupabaseConfigured) {
  setTranslationProvider(callLlmTranslate);
  setWritingFeedbackProvider(callLlmWritingFeedback);
}

export function containsKorean(t: string) { return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(t); }

export function detectPoliteness(ko: string) {
  if (/(습니다|합니다|십니다|드립니다|을까요|ㅂ니까|시겠)/.test(ko)) return "formal";
  if (/(해요|어요|아요|세요|네요|죠)/.test(ko)) return "neutral";
  return "casual";
}

export function detectIntent(ko: string) {
  if (/(해줄|해주|보내줘|해주세요|가능할까요|부탁|요청|할 수 있)/.test(ko)) return "request";
  if (/(못|안 될|어려울|힘들|곤란|죄송|미안)/.test(ko)) return "decline";
  if (/(어떻게|왜|언제|어디|누가|무엇|뭐|인가요|일까요|\?)/.test(ko)) return "question";
  if (/(감사|고맙|덕분)/.test(ko)) return "thanks";
  if (/(할게|하겠|드릴게|보낼게|확인해볼|알아볼)/.test(ko)) return "commit";
  if (/(같아요|것 같|생각해|제 의견|제안)/.test(ko)) return "opinion";
  return "statement";
}

export const PHRASE_MAP = [
  {
    re: /(회의|미팅).*(일정|시간).*(변경|조정|미루|리스케)/,
    formal: "Would it be possible to reschedule our meeting?",
    neutral: "Can we move the meeting to another time?",
    casual: "Any chance we can push the meeting?",
    nuance: "한국어 '일정을 조정하고 싶다'는 완곡하지만, 영어에서는 reschedule 한 단어로 깔끔하게 끝냅니다. 이유를 길게 붙이지 않는 것이 오히려 프로페셔널합니다.",
    alts: [
      { en: "Would it work to push our meeting to Thursday?", ko: "미팅을 목요일로 옮겨도 괜찮을까요?", note: "대안 시점을 함께 제시하면 훨씬 매너 있게 들립니다" },
      { en: "Sorry — something came up. Can we find another time?", ko: "죄송해요, 일이 생겨서요. 다른 시간 잡을 수 있을까요?", note: "something came up = 만능 사유 표현" },
    ],
  },
  {
    re: /(확인|검토).*(하고|한 후|해보고).*(알려|회신|연락|답변)/,
    formal: "Let me look into it and get back to you shortly.",
    neutral: "Let me check and get back to you.",
    casual: "Lemme check and I'll let you know.",
    nuance: "'I will check'보다 'Let me check'가 훨씬 협조적으로 들립니다. 즉답이 어려울 때 시간을 버는 가장 자연스러운 표현입니다.",
    alts: [
      { en: "I'll dig into this and follow up by EOD.", ko: "자세히 확인해보고 오늘 안에 팔로업할게요.", note: "EOD = End of Day" },
      { en: "Give me a bit to look into it.", ko: "확인할 시간 좀 주세요.", note: "동료 사이의 캐주얼한 버전" },
    ],
  },
  {
    re: /(자료|파일|문서|보고서).*(보내|공유|전달)/,
    formal: "Could you share the file with me when you get a chance?",
    neutral: "Could you send me the file?",
    casual: "Mind sending that file over?",
    nuance: "'when you get a chance'를 붙이면 급하지 않다는 신호가 되어 상대의 부담이 크게 줄어듭니다. 영어권 직장 문화에서 매우 중요한 완충 장치입니다.",
    alts: [
      { en: "Could you shoot me that deck?", ko: "그 자료 좀 보내주실래요?", note: "shoot = 가볍게 보내다, 동료 사이 최빈출" },
      { en: "Would you mind forwarding that thread?", ko: "그 메일 스레드 전달해 주실 수 있을까요?", note: "가장 정중한 형태" },
    ],
  },
  {
    re: /(죄송|미안).*(늦|지연|못)/,
    formal: "I apologize for the delay on this.",
    neutral: "Sorry for the delay on this.",
    casual: "Sorry this took a while.",
    nuance: "한국어는 사과를 길게 하지만 영어 비즈니스에서는 짧게 사과하고 바로 해결책이나 새 일정으로 넘어가는 것이 신뢰를 줍니다.",
    alts: [
      { en: "Apologies for the slow reply — catching up now.", ko: "답장이 늦어 죄송합니다. 지금 확인 중이에요.", note: "이메일 회신 지연 시 표준 표현" },
      { en: "Sorry to keep you waiting on this.", ko: "기다리게 해서 죄송해요.", note: "상대 입장을 배려한 형태" },
    ],
  },
  {
    re: /(어렵|힘들|곤란|못 할|안 될|불가능)/,
    formal: "I'm afraid that might be difficult on our end.",
    neutral: "That's going to be tough for us.",
    casual: "That's a bit of a stretch for us.",
    nuance: "영어권에서는 'No'를 직접 말하지 않고 difficult / tough / a stretch로 완충합니다. 'I'm afraid'는 나쁜 소식 앞에 붙이는 표준 신호어입니다.",
    alts: [
      { en: "I don't think we can make that work by Friday.", ko: "금요일까지는 어려울 것 같아요.", note: "불가능한 이유를 구체적으로 한정" },
      { en: "That's doable, but we'd need to drop something else.", ko: "가능은 한데, 다른 걸 하나 빼야 해요.", note: "거절 대신 조건을 제시하는 고급 화법" },
    ],
  },
  {
    re: /(감사|고맙)/,
    formal: "Thank you so much for your help on this.",
    neutral: "Thanks a lot for the help.",
    casual: "Thanks — you're a lifesaver.",
    nuance: "무엇에 대한 감사인지 한 조각만 붙이면 훨씬 진심으로 들립니다. 'Thanks for turning this around so quickly.'처럼요.",
    alts: [
      { en: "Really appreciate you jumping on this.", ko: "빨리 봐주셔서 정말 감사해요.", note: "appreciate가 thanks보다 무게감 있음" },
      { en: "Thanks for turning this around so fast.", ko: "이렇게 빨리 처리해 주셔서 감사합니다.", note: "turn around = 신속히 처리하다" },
    ],
  },
  {
    re: /(다시|재).*(검토|논의|이야기|얘기)/,
    formal: "I think this deserves another look.",
    neutral: "I think we should revisit this.",
    casual: "Can we circle back on this?",
    nuance: "circle back은 회의를 일단 끊고 나중에 다시 다루자는 뜻으로 미국 직장에서 극도로 자주 쓰입니다. 단, 이메일 문서에서는 revisit이 더 안전합니다.",
    alts: [
      { en: "Let's park this and come back to it next week.", ko: "이건 일단 보류하고 다음 주에 다시 보시죠.", note: "park = 잠시 보류하다" },
      { en: "Can we take another pass at this?", ko: "이거 한 번 더 손볼 수 있을까요?", note: "take a pass at = 한 번 검토하다" },
    ],
  },
  {
    re: /(생각|의견|제안).*(있|드리|말씀)/,
    formal: "I'd like to share a thought on this, if I may.",
    neutral: "I have a thought on this.",
    casual: "Quick thought here.",
    nuance: "영어 회의에서는 의견을 던지기 전에 짧은 신호어를 붙입니다. 이게 없으면 갑자기 끼어든 느낌이 되어 무례하게 들릴 수 있습니다.",
    alts: [
      { en: "Building on that — what if we tried a phased rollout?", ko: "그 말씀에 덧붙이자면, 단계적 출시는 어떨까요?", note: "Building on that = 상대 의견을 존중하며 확장" },
      { en: "Playing devil's advocate for a second...", ko: "일부러 반대편에서 짚어보자면...", note: "반대 의견을 안전하게 꺼내는 장치" },
    ],
  },
  {
    re: /(진행|상황|현황).*(어떻게|어디까지|공유|알려)/,
    formal: "Could you give me a quick status update on this?",
    neutral: "Where are we on this?",
    casual: "How's this coming along?",
    nuance: "'Where are we on this?'는 사람이 아니라 일을 주어로 삼아 추궁하는 느낌을 없앱니다. 상사가 진행 상황을 물을 때 가장 무난한 표현입니다.",
    alts: [
      { en: "Any movement on this?", ko: "이 건 진전 있나요?", note: "가장 가볍게 묻는 방법" },
      { en: "Just checking in on where this landed.", ko: "이게 어떻게 마무리됐는지 확인차 여쭤봐요.", note: "checking in = 부담 없는 확인" },
    ],
  },
  {
    re: /(잘|괜찮게|성공적).*(됐|되었|진행)/,
    formal: "It went well overall.",
    neutral: "It went pretty well.",
    casual: "It went great.",
    nuance: "영어에서는 성과를 말할 때 구체적 근거를 한 줄 붙이는 것이 기본입니다. 'It went well — we got three follow-up requests.'",
    alts: [
      { en: "It landed well with the team.", ko: "팀 반응이 좋았어요.", note: "land well = 잘 받아들여지다" },
      { en: "Solid response overall.", ko: "전반적으로 반응이 괜찮았어요.", note: "명사형으로 간결하게" },
    ],
  },
];

export const INTENT_FALLBACK = {
  request: { formal: "Could you help me with this when you get a chance?", neutral: "Could you help me with this?", casual: "Mind giving me a hand with this?", nuance: "정확한 사전 항목을 찾지 못해 요청 의도만 살린 기본 문장입니다. 목적어를 채워 넣으면 바로 쓸 수 있어요." },
  decline: { formal: "I'm afraid that won't be possible on our end.", neutral: "That's going to be tough.", casual: "Yeah, that's not gonna work.", nuance: "거절 의도를 감지했습니다. 영어는 'I'm afraid'로 완충한 뒤 대안을 제시하는 것이 표준입니다." },
  question: { formal: "Could you clarify what you mean by that?", neutral: "Can you explain that a bit more?", casual: "What do you mean exactly?", nuance: "질문 의도를 감지했습니다. 되묻는 표현은 clarify를 쓰면 무례하지 않게 들립니다." },
  thanks: { formal: "Thank you, I really appreciate it.", neutral: "Thanks, I appreciate it.", casual: "Thanks a bunch!", nuance: "감사 의도를 감지했습니다." },
  commit: { formal: "I'll take care of it and follow up shortly.", neutral: "I'll handle it and let you know.", casual: "On it — I'll ping you.", nuance: "본인이 처리하겠다는 의사를 감지했습니다. 'On it'은 짧고 믿음직하게 들리는 실무 표현입니다." },
  opinion: { formal: "In my view, this is worth reconsidering.", neutral: "I think we should take another look at this.", casual: "I feel like this needs another look.", nuance: "의견 표명 의도를 감지했습니다." },
  statement: { formal: "Here's where things stand.", neutral: "This is where we are.", casual: "So here's the deal.", nuance: "정확한 사전 매칭에 실패했습니다. 아래는 참고용 기본 문장이며 실제 의도와 다를 수 있으니 직접 수정해 사용하세요." },
};

/** AI 호출이 실패했을 때 사용자에게 보여줄 한 줄 안내 (한도 초과면 서버 메시지를 그대로 사용) */
export function describeLlmFailure(e: any): string {
  if (e?.status === 429 && e?.message) return e.message;
  if (e?.status === 401) return "로그인 연결이 불안정해 AI를 쓰지 못했어요.";
  return "AI 연결이 불안정해 간이 번역으로 보여드려요.";
}

export async function translateKoreanToEnglish(koText?: string | null, profile: Record<string, any> = {}) {
  const text = (koText || "").trim();
  if (!text) return null;

  let notice;
  if (llmProvider) {
    try { const r = await llmProvider(text, profile); return { ...r, confidence: "high", source: "llm" }; }
    catch (e) { notice = describeLlmFailure(e); /* 폴백 */ }
  }

  const toneMap: Record<string, string> = { "정중한 비즈니스": "formal", "중립 실무": "neutral", "캐주얼 친근": "casual" };
  const level = toneMap[profile.tone] || detectPoliteness(text);

  const hit: any = PHRASE_MAP.find((p) => p.re.test(text));
  if (hit) return { english: hit[level] || hit.neutral, nuance: hit.nuance, alternatives: hit.alts, confidence: "high", source: "pattern", notice };

  const intent = detectIntent(text);
  const fb: any = INTENT_FALLBACK[intent as keyof typeof INTENT_FALLBACK];
  return {
    english: fb[level] || fb.neutral,
    nuance: fb.nuance,
    alternatives: [],
    confidence: intent === "statement" ? "low" : "medium",
    source: "fallback",
    notice,
  };
}
