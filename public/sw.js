/* Hook English 서비스 워커: 복습 알림(웹 푸시)을 받아 조용히 알림창에 보여줍니다.
   화면 캐시는 하지 않습니다(배포 후 항상 최신 화면). */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* 무시 */ }
  const title = data.title || "Hook English";
  const options = {
    body: data.body || "오늘 복습할 문장이 있어요.",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: "hook-review", // 같은 알림은 겹쳐 쌓이지 않고 하나로 합쳐집니다
    silent: true, // 소리·진동 없이 조용히
    data: { url: data.url || "./#/review" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && "focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
