import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Pointer } from "lucide-react";

const DONE_KEY = "hook_tour_done_v1";

type Stop = { target: string; title: string; body: string };

function stopsFor(mode: "own" | "given"): Stop[] {
  return [
    mode === "given"
      ? { target: "start", title: "1단계 · 여기서 시작해요", body: "오늘의 추천 문장 하나를 눌러 보세요. 구조와 해설이 바로 열려요." }
      : { target: "start", title: "1단계 · 여기서 시작해요", body: "하고 싶은 말을 한글로 적고 버튼을 누르면 영어 문장이 나와요." },
    { target: "menus", title: "다른 문장도 고를 수 있어요", body: "추천·뉴스·발표 문장을 누르면 3문장씩 보여줘요." },
    { target: "tabs", title: "아래 탭으로 단계가 이어져요", body: "문장·해설(1) → 듣기(2) → 말하기(3) → 실전대화(4) → 복습(5) 순서예요." },
  ];
}

export function Tutorial({ startMode }: { startMode: "own" | "given" }) {
  const stops = stopsFor(startMode);
  const [idx, setIdx] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // 처음 한 번 자동 시작 (설문을 마친 사용자만). 다시 보기는 이벤트로.
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(DONE_KEY) === "1"; } catch { /* 무시 */ }
    const t = seen ? undefined : window.setTimeout(() => setIdx(0), 900);
    const onReplay = () => { window.scrollTo({ top: 0 }); setIdx(0); };
    window.addEventListener("hook-tour", onReplay);
    return () => { if (t) clearTimeout(t); window.removeEventListener("hook-tour", onReplay); };
  }, []);

  const measure = useCallback(() => {
    if (idx === null) return;
    const el = document.querySelector(`[data-tour="${stops[idx].target}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "auto" });
    setRect(el.getBoundingClientRect());
  }, [idx, startMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    if (idx === null) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [idx, measure]);

  if (idx === null) return null;
  const stop = stops[idx];
  const last = idx === stops.length - 1;
  const close = () => { try { localStorage.setItem(DONE_KEY, "1"); } catch { /* 무시 */ } setIdx(null); };
  const next = () => (last ? close() : setIdx(idx + 1));

  const pad = 6;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const CARD_H = 170; // 설명 카드 대략 높이
  // 대상 바로 아래(공간 부족하면 바로 위)에 설명 카드를 붙입니다.
  let cardTop = 24;
  if (rect) {
    const underTop = rect.bottom + pad + 14;
    const aboveTop = rect.top - pad - 14 - CARD_H;
    cardTop = underTop + CARD_H <= vh - 8 ? underTop : Math.max(8, aboveTop);
  }

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-label="사용법 튜토리얼">
      {/* 어둡게 + 대상 부분만 밝게 */}
      {rect ? (
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)", border: "2px solid #fff" }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/60" />
      )}
      {/* 반투명 손 */}
      {rect && (
        <div className="absolute pointer-events-none" style={{ left: rect.left + Math.min(rect.width * 0.7, rect.width - 28), top: rect.top + rect.height * 0.55 }}>
          <Pointer size={44} className="tour-hand text-white drop-shadow-lg" style={{ opacity: 0.85 }} fill="rgba(255,255,255,0.35)" />
        </div>
      )}
      {/* 설명 카드 */}
      <div
        className="absolute left-4 right-4 mx-auto max-w-md bg-white rounded-2xl p-4 shadow-xl"
        style={{ top: cardTop }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-white bg-brand-600 rounded-full px-2 py-0.5">튜토리얼 · 안내 화면이에요</span>
          <span className="text-[11px] font-bold text-gray-400">{idx + 1} / {stops.length}</span>
        </div>
        <p className="text-base font-extrabold text-gray-900 mt-2">{stop.title}</p>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{stop.body}</p>
        <p className="text-[11px] text-gray-400 mt-1">지금은 눌러지지 않아요. 아래 '다음'을 눌러 주세요.</p>
        <div className="flex items-center justify-between mt-3">
          <button type="button" onClick={close} className="text-xs font-semibold text-gray-500 px-2 py-2">건너뛰기</button>
          <button type="button" onClick={next} className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold">{last ? "시작하기" : "다음"}</button>
        </div>
      </div>
    </div>
  );
}
