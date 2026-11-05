import { supabase } from "./supabaseClient";

/* ============================================================================
   복습 알림(웹 푸시)
   - 브라우저 알림 권한을 받고, 알림 주소(구독 정보)를 hook_push_subscriptions 에 저장합니다.
   - 로그인하지 않은 익명 사용자도 쓸 수 있어요(계정 ID 기준).
   - VAPID 공개 키는 비밀이 아니라서 코드에 넣어도 됩니다. (비공개 키는 Supabase 함수 비밀로만 보관)
   ============================================================================ */

// 서버에서 만든 VAPID "공개" 키. 비어 있으면 알림 설정 화면을 숨깁니다.
export const VAPID_PUBLIC_KEY = "BBCJHiWUEW4WXdtoq7GQjyay7TOa08dfcMfnhepuZHvyYVJLe4Z_13Cc_DVEVaF7eVlg5Hr_ye63FElV7FM8rLA";

export type PushState =
  | "hidden" // 키가 아직 없음(화면에 안 보임)
  | "unsupported" // 이 브라우저는 알림 불가
  | "need-install" // 아이폰: 홈 화면에 추가해야 함
  | "denied" // 브라우저에서 차단됨
  | "off"
  | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY || !supabase) return "hidden";
  if (isIos() && !isStandalone()) return "need-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "off";
  }
}

/** 알림 켜기. 실패하면 사용자에게 보여줄 문장을 돌려줍니다. 성공하면 null. */
export async function enablePush(): Promise<string | null> {
  if (!supabase) return "서버에 연결되어 있지 않아요.";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "알림 권한이 허용되지 않았어요. 브라우저 설정에서 허용해 주세요.";
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "알림 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
    const { error } = await supabase.from("hook_push_subscriptions").upsert(
      { user_id: uid, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, enabled: true },
      { onConflict: "endpoint" }
    );
    return error ? "알림 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." : null;
  } catch {
    return "알림을 켜지 못했어요. 이 브라우저에서는 지원되지 않을 수 있어요.";
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase?.from("hook_push_subscriptions").delete().eq("endpoint", endpoint);
    }
  } catch {
    /* 무시 */
  }
}
