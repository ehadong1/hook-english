import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite는 VITE_ 로 시작하는 환경변수만 브라우저 번들에 노출합니다.
// .env 에 아래 두 줄을 추가해야 합니다 (Supabase 대시보드 → Settings → API):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=<anon / public key>  (service_role 키는 절대 넣지 마세요!)
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// 키가 없으면 앱이 죽지 않고 "로컬 전용 모드"로 동작하도록 null을 내보냅니다.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

/**
 * 로그인 화면 없이 "익명 로그인"으로 이 브라우저 전용 사용자(auth.uid)를 만듭니다.
 * 세션은 브라우저에 저장돼 다음 방문에도 같은 사용자로 이어집니다. DB 규칙(RLS)과
 * Edge Function 호출 제한이 이 사용자 기준으로 동작합니다.
 * 실패하면(익명 로그인이 꺼져 있는 등) null을 반환하고, 호출한 쪽이 로컬 모드로 계속합니다.
 */
export async function ensureSessionUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.id) return data.session.user.id;

    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn("[Hook English] 익명 로그인 실패:", error.message);
      return null;
    }
    return signed.user?.id ?? null;
  } catch (err) {
    console.warn("[Hook English] 익명 로그인 중 오류:", err);
    return null;
  }
}

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[Hook English] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 없어 " +
      "로컬 전용 모드로 실행됩니다 (새로고침하면 데이터가 사라집니다). " +
      ".env 파일을 확인하세요."
  );
}
