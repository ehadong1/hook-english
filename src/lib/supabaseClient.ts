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

if (!isSupabaseConfigured && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[Hook English] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 없어 " +
      "로컬 전용 모드로 실행됩니다 (새로고침하면 데이터가 사라집니다). " +
      ".env 파일을 확인하세요."
  );
}
