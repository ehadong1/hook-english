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
  };
}

/** 검수 완료(approved)된 표현 중 가장 최근 것들 (추천 문장 섞어 넣기용) */
export async function fetchLatestPhrases(limit = 30): Promise<PhraseBankEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("hook_phrase_bank")
    .select("id, grammar_key, english, korean_meaning, note, tone, situation, source_url, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    if (error) console.warn("[Hook English] 최신 표현 로드 실패:", error.message);
    return [];
  }
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
