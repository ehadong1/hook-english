import { supabase } from "./supabaseClient";

// App.tsx 안에서 쓰는 모양 그대로 (camelCase). DB 컬럼은 snake_case라서
// 여기서 양방향 변환을 담당합니다. App.tsx는 이 모듈만 알면 되고
// Supabase 테이블 구조는 몰라도 됩니다.

export type StoreItem = {
  id: string;
  type: "word" | "sentence";
  text: string;
  meaning?: string;
  sourceId?: string;
  stage: number;
  nextReviewAt: string; // ISO
  mastered: boolean;
};

export type HistoryEntry = {
  sentenceId: string;
  text: string;
  grammarKeys: string[];
  at: string; // ISO
};

export type RemoteState = {
  answers: Record<string, unknown> | null;
  items: StoreItem[];
  history: HistoryEntry[];
};

const EMPTY_STATE: RemoteState = { answers: null, items: [], history: [] };

// App.tsx의 SENTENCE_BANK 항목과 동일한 모양 (SentenceList/SentenceDissection이
// 그대로 재사용할 수 있도록). hook_news_sentences 테이블에서 읽어옵니다.
export type NewsSentence = {
  id: string;
  level: string;
  topic: string;
  tone: string;
  situations: string[];
  text: string;
  translation: string;
  grammarKeys: string[];
  vocab: { word: string; pos?: string; meaning: string; note?: string; freq?: string }[];
  nativeAlternatives: { en: string; ko: string; note: string }[];
  sourceUrl?: string;
  isNews: true;
};

/** 앱 시작 시 이 기기의 저장된 데이터를 한번에 불러옵니다. */
export async function fetchRemoteState(deviceId: string | null): Promise<RemoteState> {
  if (!supabase || !deviceId) return EMPTY_STATE;

  const [profileRes, itemsRes, historyRes] = await Promise.all([
    supabase.from("hook_profiles").select("answers").eq("device_id", deviceId).maybeSingle(),
    supabase.from("hook_items").select("*").eq("device_id", deviceId),
    supabase.from("hook_history").select("*").eq("device_id", deviceId),
  ]);

  if (profileRes.error) console.warn("[Hook English] 프로필 로드 실패:", profileRes.error.message);
  if (itemsRes.error) console.warn("[Hook English] 저장 문장/단어 로드 실패:", itemsRes.error.message);
  if (historyRes.error) console.warn("[Hook English] 학습 이력 로드 실패:", historyRes.error.message);

  const items: StoreItem[] = (itemsRes.data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    text: row.text,
    meaning: row.meaning ?? undefined,
    sourceId: row.source_id ?? undefined,
    stage: row.stage,
    nextReviewAt: row.next_review_at,
    mastered: row.mastered,
  }));

  const history: HistoryEntry[] = (historyRes.data || []).map((row: any) => ({
    sentenceId: row.sentence_id,
    text: row.text,
    grammarKeys: row.grammar_keys || [],
    at: row.at,
  }));

  return {
    answers: (profileRes.data?.answers as Record<string, unknown>) ?? null,
    items,
    history,
  };
}

/** 온보딩 서베이 완료/수정 시 호출 */
export async function saveProfileRemote(deviceId: string | null, answers: Record<string, unknown>) {
  if (!supabase || !deviceId) return;
  const { error } = await supabase
    .from("hook_profiles")
    .upsert({ device_id: deviceId, answers, updated_at: new Date().toISOString() }, { onConflict: "device_id" });
  if (error) console.warn("[Hook English] 프로필 저장 실패:", error.message);
}

/** 단어/문장을 새로 저장할 때 호출 (id는 프론트에서 미리 생성) */
export async function insertItemRemote(deviceId: string | null, item: StoreItem) {
  if (!supabase || !deviceId) return;
  const { error } = await supabase.from("hook_items").insert({
    id: item.id,
    device_id: deviceId,
    type: item.type,
    text: item.text,
    meaning: item.meaning ?? null,
    source_id: item.sourceId ?? null,
    stage: item.stage,
    next_review_at: item.nextReviewAt,
    mastered: item.mastered,
  });
  if (error) console.warn("[Hook English] 항목 저장 실패:", error.message);
}

/** 복습 완료/마스터 처리 등 기존 항목 갱신 */
export async function updateItemRemote(
  deviceId: string | null,
  id: string,
  patch: Partial<Pick<StoreItem, "stage" | "nextReviewAt" | "mastered">>
) {
  if (!supabase || !deviceId) return;
  const payload: Record<string, unknown> = {};
  if (patch.stage !== undefined) payload.stage = patch.stage;
  if (patch.nextReviewAt !== undefined) payload.next_review_at = patch.nextReviewAt;
  if (patch.mastered !== undefined) payload.mastered = patch.mastered;

  const { error } = await supabase.from("hook_items").update(payload).eq("id", id).eq("device_id", deviceId);
  if (error) console.warn("[Hook English] 항목 갱신 실패:", error.message);
}

/** 문장을 열람해 문법 이력이 새로 쌓일 때 호출 (같은 문장은 1회만 기록) */
export async function insertHistoryRemote(deviceId: string | null, entry: HistoryEntry) {
  if (!supabase || !deviceId) return;
  const { error } = await supabase
    .from("hook_history")
    .upsert(
      {
        device_id: deviceId,
        sentence_id: entry.sentenceId,
        text: entry.text,
        grammar_keys: entry.grammarKeys,
        at: entry.at,
      },
      { onConflict: "device_id,sentence_id", ignoreDuplicates: true }
    );
  if (error) console.warn("[Hook English] 학습 이력 저장 실패:", error.message);
}

export type PhraseBankEntry = {
  id: string;
  grammarKey: string;
  english: string;
  korean: string;
  note?: string;
  tone?: string;
  situation?: string;
  createdAt?: string;
  sourceUrl?: string;
  levelBand?: string; // 왕초보 / 기초 회화 / 중상급 (AI 생성 표현에만 있어요)
  fieldTag?: string; // 설문의 업무 영역
};

function mapPhraseRow(row: any): PhraseBankEntry {
  return {
    id: row.id,
    grammarKey: row.grammar_key,
    english: row.english,
    korean: row.korean_meaning,
    note: row.note || undefined,
    tone: row.tone || undefined,
    situation: row.situation || undefined,
    createdAt: row.created_at || undefined,
    sourceUrl: row.source_url || undefined,
    levelBand: row.level_band || undefined,
    fieldTag: row.field_tag || undefined,
  };
}

/* ---------------- 표현 제안 · 관리자 검수 ---------------- */

export const PHRASE_SITUATIONS = ["화상회의 및 발표", "이메일 및 문서", "외국인 동료와 일상 대화", "해외 출장 및 여행"] as const;

export type PendingPhrase = {
  id: string;
  english: string;
  korean: string;
  situationTag?: string;
  note?: string;
  sourceType: string;
  score?: number;
  reason?: string;
  sourceUrl?: string;
};

/** 내가 관리자인지 (hook_admins 에 등록된 계정) */
export async function isPhraseAdmin(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.rpc("is_hook_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}

/** 로그인한 사용자가 표현을 제안합니다. 항상 "검토 대기"로 저장돼요. 실패하면 사용자에게 보여줄 문장을 돌려줍니다. */
export async function submitPhrase(input: { english: string; korean: string; situationTag: string; note?: string }): Promise<string | null> {
  if (!supabase) return "서버에 연결되어 있지 않아요.";
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return "로그인이 필요해요.";
  const { error } = await supabase.from("hook_phrase_bank").insert({
    grammar_key: "idiomaticExpression",
    english: input.english.trim(),
    korean_meaning: input.korean.trim(),
    situation_tag: input.situationTag,
    situation: input.situationTag,
    note: input.note?.trim() || null,
    tone: "neutral",
    status: "pending_review",
    source_type: "user",
    submitted_by: uid,
    verified_reason: "사용자 제안 — 관리자 확인 필요",
  });
  if (error) {
    if (/row-level security|policy/i.test(error.message)) return "오늘은 더 제안할 수 없어요. (하루 10개까지, 로그인 필요)";
    return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  return null;
}

/** (관리자) 검토 대기 표현 목록 */
export async function fetchPendingPhrases(limit = 30): Promise<PendingPhrase[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hook_phrase_bank")
    .select("id, english, korean_meaning, situation_tag, note, source_type, verified_score, verified_reason, source_url")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    english: r.english,
    korean: r.korean_meaning,
    situationTag: r.situation_tag || undefined,
    note: r.note || undefined,
    sourceType: r.source_type || "collector",
    score: r.verified_score ?? undefined,
    reason: r.verified_reason || undefined,
    sourceUrl: r.source_url || undefined,
  }));
}

/** (관리자) 표현 승인/반려 */
export async function setPhraseStatus(id: string, status: "approved" | "rejected"): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("hook_phrase_bank").update({ status }).eq("id", id);
  return !error;
}

/** 검수 완료(approved)된 표현 중 가장 최근 것들 (추천 문장 섞어 넣기용) */
export async function fetchLatestPhrases(limit = 30): Promise<PhraseBankEntry[]> {
  if (!supabase) return [];
  const base = "id, grammar_key, english, korean_meaning, note, tone, situation, source_url, created_at";
  const run = async (cols: string) => {
    const out: any[] = [];
    // Supabase는 한 번에 1,000개까지만 주므로 나눠서 가져옵니다.
    for (let from = 0; from < limit; from += 1000) {
      const to = Math.min(from + 999, limit - 1);
      const { data, error } = await supabase!.from("hook_phrase_bank").select(cols).eq("status", "approved").order("created_at", { ascending: false }).range(from, to);
      if (error) return { error, rows: null as any[] | null };
      out.push(...(data || []));
      if (!data || data.length < to - from + 1) break;
    }
    return { error: null, rows: out };
  };
  let r = await run(`${base}, level_band, field_tag`);
  if (r.error) r = await run(base); // 수준·분야 컬럼(v4 SQL) 추가 전에도 동작하도록
  if (r.error || !r.rows) {
    console.warn("[Hook English] 최신 표현 로드 실패:", r.error?.message);
    return [];
  }
  return r.rows.map(mapPhraseRow);
}

/** 검수 완료(approved)된 표현 중 상황 태그가 맞는 것(예: "화상회의 및 발표")을 가져옵니다. 실패하면 빈 배열. */
export async function fetchPhrasesBySituation(situationTag: string, limit = 30): Promise<PhraseBankEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hook_phrase_bank")
    .select("id, grammar_key, english, korean_meaning, note, tone, situation, source_url, created_at")
    .eq("status", "approved")
    .eq("situation_tag", situationTag)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(mapPhraseRow);
}

/**
 * 검수 완료(approved)된 표현 뱅크에서, 해당 문법 키와 맞는 최신 표현을 가져옵니다.
 * (Exa로 계속 수집되는 원어민 비즈니스 표현 → "원어민은 이렇게도 말해요"에 사용)
 * 실패하거나 비어 있으면 빈 배열을 돌려주고, 화면은 해당 영역을 그냥 숨깁니다.
 */
export async function fetchPhraseBank(grammarKeys: string[], limit = 3): Promise<PhraseBankEntry[]> {
  if (!supabase || grammarKeys.length === 0) return [];
  const { data, error } = await supabase
    .from("hook_phrase_bank")
    .select("id, grammar_key, english, korean_meaning, note, tone, situation, source_url, created_at")
    .eq("status", "approved")
    .in("grammar_key", grammarKeys)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) console.warn("[Hook English] 표현 뱅크 로드 실패:", error.message);
    return [];
  }
  return data.map(mapPhraseRow);
}

/**
 * 검수 완료(approved)된 최신 뉴스 문장을 가져옵니다. bankTopics는 App.tsx의
 * TOPIC_TO_BANK 값들(예: "비즈니스/IT 트렌드")이어야 합니다. 실패하거나
 * Supabase가 설정되지 않았으면 빈 배열을 반환하고, 호출 쪽(App.tsx)이 기존
 * SENTENCE_BANK의 정적 뉴스 문장으로 자동 대체합니다.
 */
export async function fetchNewsSentences(bankTopics: string[]): Promise<NewsSentence[]> {
  if (!supabase || bankTopics.length === 0) return [];

  const { data, error } = await supabase
    .from("hook_news_sentences")
    .select("*")
    .eq("status", "approved")
    .in("topic", bankTopics)
    .order("published_date", { ascending: false })
    .limit(40); // 넉넉히 가져온 뒤 앱에서 수준에 맞게 골라요

  if (error || !data) {
    if (error) console.warn("[Hook English] 뉴스 문장 로드 실패:", error.message);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    level: row.level,
    topic: row.topic,
    tone: row.tone,
    situations: row.situations || [],
    text: row.text,
    translation: row.translation,
    grammarKeys: row.grammar_keys || [],
    vocab: row.vocab || [],
    nativeAlternatives: row.native_alternatives || [],
    sourceUrl: row.source_url || undefined,
    isNews: true as const,
  }));
}
