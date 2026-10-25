import { supabase } from "./supabaseClient";

export class LlmError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Edge Function이 돌려준 에러(JSON)에서 상태코드와 사용자용 메시지를 꺼냅니다. */
async function toLlmError(error: any): Promise<LlmError> {
  try {
    const status = error?.context?.status as number | undefined;
    const body = await error?.context?.json?.();
    return new LlmError(body?.error || error?.message || "AI 호출에 실패했습니다.", status);
  } catch {
    return new LlmError(error?.message || "AI 호출에 실패했습니다.");
  }
}

export type TranslateResult = {
  english: string;
  nuance: string;
  alternatives: { en: string; ko: string; note: string }[];
  grammarKeys?: string[];
  vocab?: { word: string; meaning: string; note: string }[];
};

/**
 * Supabase Edge Function("translate")을 호출해 실제 GPT-4o-mini 결과를 받아옵니다.
 * OPENAI_API_KEY는 이 함수 안(서버)에만 있고 브라우저에는 절대 내려오지 않습니다.
 * 실패하면 에러를 던지고, App.tsx의 translateKoreanToEnglish가 자동으로
 * 로컬 패턴/폴백 번역으로 대체합니다.
 */
export async function callLlmTranslate(
  text: string,
  profile: Record<string, unknown>
): Promise<TranslateResult> {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");

  const { data, error } = await supabase.functions.invoke("translate", {
    body: { text, profile },
  });

  if (error) throw await toLlmError(error);
  if (!data || data.error) throw new LlmError(data?.error || "번역 실패");

  return data as TranslateResult;
}

export type WritingFeedbackResult = {
  corrected: string;
  natural: string;
  structure: string;
  tips: string[];
  keywordsUsed: string[];
};

/**
 * Supabase Edge Function("writing-feedback")을 호출해 일기/문장 작성 피드백을
 * 실제 GPT-4o-mini로 받아옵니다. 실패하면 에러를 던지고, App.tsx의
 * analyzeUserWriting이 자동으로 로컬 규칙 기반 첨삭으로 대체합니다.
 */
export async function callLlmWritingFeedback(
  text: string,
  profile: Record<string, unknown>,
  mode: string
): Promise<WritingFeedbackResult> {
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");

  const { data, error } = await supabase.functions.invoke("writing-feedback", {
    body: { text, profile, mode },
  });

  if (error) throw await toLlmError(error);
  if (!data || data.error) throw new LlmError(data?.error || "첨삭 실패");

  return data as WritingFeedbackResult;
}

export type RoleplayMessage = { from: "user" | "partner"; text: string };

export type RoleplayResult = {
  reply: string;
  replyKo: string;
  feedback: { usedTarget: boolean; comment: string; better: string } | null;
  nextTargetIndex: number;
};

/**
 * Supabase Edge Function("roleplay")을 호출해 실전 대화의 다음 한 줄과 코칭을 받아옵니다.
 * 저장한 문장(targets)을 대화 속에서 자연스럽게 쓰도록 유도하는 것이 목적입니다.
 */
export async function callLlmRoleplay(payload: {
  messages: RoleplayMessage[];
  targets: string[];
  currentIndex: number;
  scene: string;
  profile: Record<string, unknown>;
}): Promise<RoleplayResult> {
  if (!supabase) throw new LlmError("Supabase가 설정되지 않았습니다.");

  const { data, error } = await supabase.functions.invoke("roleplay", { body: payload });
  if (error) throw await toLlmError(error);
  if (!data || data.error) throw new LlmError(data?.error || "대화 생성 실패");
  return data as RoleplayResult;
}
