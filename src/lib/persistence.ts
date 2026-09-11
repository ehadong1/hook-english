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

/** 앱 시작 시 이 기기의 저장된 데이터를 한번에 불러옵니다. */
export async function fetchRemoteState(deviceId: string): Promise<RemoteState> {
  if (!supabase) return EMPTY_STATE;

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
export async function saveProfileRemote(deviceId: string, answers: Record<string, unknown>) {
  if (!supabase) return;
  const { error } = await supabase
    .from("hook_profiles")
    .upsert({ device_id: deviceId, answers, updated_at: new Date().toISOString() }, { onConflict: "device_id" });
  if (error) console.warn("[Hook English] 프로필 저장 실패:", error.message);
}

/** 단어/문장을 새로 저장할 때 호출 (id는 프론트에서 미리 생성) */
export async function insertItemRemote(deviceId: string, item: StoreItem) {
  if (!supabase) return;
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
  deviceId: string,
  id: string,
  patch: Partial<Pick<StoreItem, "stage" | "nextReviewAt" | "mastered">>
) {
  if (!supabase) return;
  const payload: Record<string, unknown> = {};
  if (patch.stage !== undefined) payload.stage = patch.stage;
  if (patch.nextReviewAt !== undefined) payload.next_review_at = patch.nextReviewAt;
  if (patch.mastered !== undefined) payload.mastered = patch.mastered;

  const { error } = await supabase.from("hook_items").update(payload).eq("id", id).eq("device_id", deviceId);
  if (error) console.warn("[Hook English] 항목 갱신 실패:", error.message);
}

/** 문장을 열람해 문법 이력이 새로 쌓일 때 호출 (같은 문장은 1회만 기록) */
export async function insertHistoryRemote(deviceId: string, entry: HistoryEntry) {
  if (!supabase) return;
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
