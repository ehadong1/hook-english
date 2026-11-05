// Supabase Edge Function: 복습 알림(웹 푸시) 보내기
//
// 하루 한 번(GitHub Actions 예약) 호출되어, "복습할 문장이 있는" 사람에게만 조용한 알림을 보냅니다.
//  - 복습 대상: hook_items 에서 mastered=false 이고 next_review_at <= 지금
//  - 같은 날(한국시간) 이미 보낸 사람에게는 다시 보내지 않습니다(last_sent_at)
//  - 알림에는 "복습할 문장 N개" 안내만 담고, 학습 문장 내용은 담지 않습니다
//  - 더 이상 유효하지 않은 알림 주소(404/410)는 자동으로 지웁니다
// 호출 권한: 서비스 롤 키를 Authorization 헤더로 보낸 요청만 허용합니다(공개 anon 키로는 불가).
//
// 사전 준비: supabase_push_migration.sql 실행, VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT 비밀 저장
// 배포: supabase functions deploy send-review-push --project-ref <PROJECT_ID>
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "https://ehadong1.github.io/hook-english/";

const kstDate = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!SERVICE_KEY || bearer !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID keys missing" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const now = new Date();
  const today = kstDate(now);

  const { data: subs, error } = await db
    .from("hook_push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,last_sent_at")
    .eq("enabled", true);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  const result = { subscriptions: subs?.length ?? 0, sent: 0, skippedNoDue: 0, skippedAlreadySent: 0, removed: 0, failed: 0 };
  const dueCache = new Map<string, number>();

  for (const s of subs ?? []) {
    if (s.last_sent_at && kstDate(new Date(s.last_sent_at)) === today) { result.skippedAlreadySent++; continue; }

    let due = dueCache.get(s.user_id);
    if (due === undefined) {
      const { count } = await db
        .from("hook_items")
        .select("id", { count: "exact", head: true })
        .eq("device_id", s.user_id)
        .eq("mastered", false)
        .lte("next_review_at", now.toISOString());
      due = count ?? 0;
      dueCache.set(s.user_id, due);
    }
    if (due <= 0) { result.skippedNoDue++; continue; }

    const payload = JSON.stringify({
      title: `복습할 문장이 ${due}개 있어요`,
      body: "잊기 전에 3분만 다시 볼까요?",
      url: "./#/review",
    });
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
      await db.from("hook_push_subscriptions").update({ last_sent_at: now.toISOString() }).eq("id", s.id);
      result.sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) {
        await db.from("hook_push_subscriptions").delete().eq("id", s.id);
        result.removed++;
      } else {
        result.failed++;
      }
    }
  }

  return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
});
