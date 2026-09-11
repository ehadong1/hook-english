const STORAGE_KEY = "hook_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// 로그인 기능이 생기기 전까지, 이 브라우저를 식별하는 임의의 ID를
// localStorage에 저장해두고 계속 재사용합니다. (기기를 바꾸면 데이터가
// 이어지지 않습니다 — 나중에 이메일 로그인을 붙이면 해결됩니다.)
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
