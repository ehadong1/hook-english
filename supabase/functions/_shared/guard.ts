// translate / writing-feedback 두 Edge Function이 같이 쓰는 보호 장치.
//  - 로그인(익명 로그인 포함)한 사용자만 통과 (anon 키만 들고 직접 호출하면 401)
//  - 사용자별 / 서비스 전체 하루 호출 횟수 제한 (DB의 hook_consume_quota 함수 사용)
//  - CORS를 우리 사이트 주소로만 허용
import { createClient } from "npm:@supabase/supabase-js@2";

// 웹앱이 올라가는 주소들. 도메인을 옮기면 여기에 추가하세요.
const ALLOWED_ORIGINS = [
  "https://ehadong1.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// 하루 한도 (GPT 비용 상한을 정하는 값). 필요하면 여기만 바꾸고 다시 배포하세요.
export const USER_DAILY_LIMIT = 30;
export const GLOBAL_DAILY_LIMIT = 1000;

export function corsFor(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

export function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** 통과하면 null, 막아야 하면 바로 돌려줄 Response를 반환합니다. */
export async function guard(req: Request, cors: Record<string, string>): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "로그인이 필요합니다." }, 401, cors);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "로그인이 필요합니다." }, 401, cors);
  }

  const { data: status, error: quotaErr } = await supabase.rpc("hook_consume_quota", {
    p_user_limit: USER_DAILY_LIMIT,
    p_global_limit: GLOBAL_DAILY_LIMIT,
  });
  if (quotaErr) {
    console.error("[guard] 한도 확인 실패:", quotaErr);
    return json({ error: "사용량 확인에 실패했습니다." }, 500, cors);
  }
  if (status === "user_limit") {
    return json({ error: "오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 시도해주세요." }, 429, cors);
  }
  if (status === "global_limit") {
    return json({ error: "지금 이용자가 많아 잠시 후 다시 시도해주세요." }, 429, cors);
  }
  if (status !== "ok") {
    return json({ error: "로그인이 필요합니다." }, 401, cors);
  }
  return null;
}
