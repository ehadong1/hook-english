import { supabase } from "./supabaseClient";

/* ============================================================================
   약관·개인정보 동의 기록
   - 구글 로그인은 화면이 구글로 넘어갔다 돌아오기 때문에, 동의 사실을 먼저 브라우저에 적어 두었다가
     로그인이 끝난 뒤 서버(hook_consents)에 한 번 저장합니다.
   - 약관을 고치면 아래 버전(날짜)을 바꿉니다. 그러면 새 버전에 대한 동의를 다시 받을 수 있어요.
   ============================================================================ */

export const TERMS_VERSION = "2026-11-03";
export const PRIVACY_VERSION = "2026-11-03";

const KEY = "hook_consent_pending";

export function markConsentPending() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ terms: TERMS_VERSION, privacy: PRIVACY_VERSION, at: new Date().toISOString() }));
  } catch { /* 저장소를 못 써도 로그인은 진행 */ }
}

/** 로그인(회원 전환)이 끝난 뒤 호출하면, 미리 적어 둔 동의 내용을 서버에 저장하고 지웁니다. */
export async function flushPendingConsent(userId: string): Promise<void> {
  if (!supabase) return;
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { return; }
  if (!raw) return;
  try {
    const p = JSON.parse(raw) as { terms: string; privacy: string; at: string };
    const { error } = await supabase.from("hook_consents").insert({
      user_id: userId,
      terms_version: p.terms,
      privacy_version: p.privacy,
      accepted_at: p.at,
    });
    if (error) { console.warn("[Hook English] 동의 기록 저장 실패:", error.message); return; }
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("[Hook English] 동의 기록 처리 중 오류:", err);
  }
}

export const legalUrl = (page: "terms" | "privacy") => `${import.meta.env.BASE_URL}${page}.html`;
