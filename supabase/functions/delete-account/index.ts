// 회원 탈퇴: 로그인한 본인의 기록을 모두 지우고 계정(auth 사용자)까지 삭제합니다.
// - 요청한 사람의 로그인 토큰으로 "누구인지" 확인한 뒤, 그 사람의 데이터만 지웁니다.
// - 삭제는 서버의 service role 키로 실행합니다 (이 키는 화면에 노출되지 않습니다).
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticate, corsFor, json } from "../_shared/guard.ts";

Deno.serve(async (req) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "허용되지 않는 요청입니다." }, 405, cors);

  const auth = await authenticate(req, cors);
  if (auth instanceof Response) return auth;

  const { data: userData } = await auth.client.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return json({ error: "로그인이 필요합니다." }, 401, cors);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // device_id(문자열)로 묶인 테이블 / user_id(uuid)로 묶인 테이블
  const byDevice = ["hook_history", "hook_items", "hook_writing_log", "hook_profiles"];
  const byUser = ["hook_reviews", "hook_consents", "hook_push_subscriptions", "hook_usage", "hook_tts_usage"];
  const failed: string[] = [];

  for (const t of byDevice) {
    const { error } = await admin.from(t).delete().eq("device_id", uid);
    if (error) { console.error("[delete-account]", t, error.message); failed.push(t); }
  }
  for (const t of byUser) {
    const { error } = await admin.from(t).delete().eq("user_id", uid);
    if (error) { console.error("[delete-account]", t, error.message); failed.push(t); }
  }

  // 데이터 삭제가 하나라도 실패하면 계정은 남겨 둡니다 (다시 시도할 수 있도록).
  if (failed.length) {
    return json({ error: "일부 기록을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 500, cors);
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    console.error("[delete-account] deleteUser", delErr.message);
    return json({ error: "계정을 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, 500, cors);
  }
  return json({ ok: true }, 200, cors);
});
