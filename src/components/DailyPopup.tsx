import { useEffect, useState } from "react";
import { Newspaper, Sparkles, X } from "lucide-react";

/* ============================================================================
   하루 한 번 뜨는 "오늘의 학습" 팝업
   - 가장 최근에 쓴 학습 메뉴(뉴스 / 추천)에 맞춰 문구가 바뀝니다. 처음엔 추천 3문장.
   - 하루에 한 번만, 튜토리얼을 마친 뒤에만 보여줍니다.
   - "확인하기"를 누르면 그 메뉴가 홈 화면에서 바로 열립니다.
   ============================================================================ */

export const LAST_MENU_KEY = "hook_last_menu_v1";
const SHOWN_KEY = "hook_daily_popup_date_v1";

const today = () => new Date().toLocaleDateString("sv-SE"); // 2026-11-18 형식 (기기 날짜 기준)

export function rememberMenu(mode: string) {
  if (mode !== "news" && mode !== "recommended") return;
  try { localStorage.setItem(LAST_MENU_KEY, mode); } catch { /* 무시 */ }
}

export function DailyPopup({ onOpen, enabled }: { onOpen: (mode: "news" | "recommended") => void; enabled: boolean }) {
  const [mode, setMode] = useState<"news" | "recommended" | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (!localStorage.getItem("hook_tour_done_v1")) return; // 튜토리얼이 끝난 뒤에만
      if (localStorage.getItem(SHOWN_KEY) === today()) return;
      const last = localStorage.getItem(LAST_MENU_KEY) === "news" ? "news" : "recommended";
      const t = setTimeout(() => { setMode(last); localStorage.setItem(SHOWN_KEY, today()); }, 1200);
      return () => clearTimeout(t);
    } catch { /* 저장소를 못 쓰면 팝업을 건너뜁니다 */ }
  }, [enabled]);

  if (!mode) return null;
  const isNews = mode === "news";
  const Icon = isNews ? Newspaper : Sparkles;
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center px-4 pb-6" role="dialog" aria-modal="true" aria-label="오늘의 학습">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl relative">
        <button type="button" aria-label="닫기" onClick={() => setMode(null)} className="absolute top-3 right-3 text-gray-400"><X size={18} /></button>
        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isNews ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"}`}><Icon size={20} /></span>
        <p className="text-base font-extrabold text-gray-900 mt-3">{isNews ? "오늘의 뉴스 3문장이 준비됐어요" : "오늘의 추천 3문장이 준비됐어요"}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          {isNews ? "내 분야의 최신 기사에서 골랐어요. 하루 3문장이면 충분해요." : "내 수준과 분야에 맞춰 골랐어요. 하루 3문장이면 충분해요."}
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button type="button" onClick={() => setMode(null)} className="py-3 rounded-xl bg-gray-100 text-sm font-semibold text-gray-700">나중에</button>
          <button type="button" onClick={() => { const m = mode; setMode(null); onOpen(m); }} className="py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold">{isNews ? "오늘의 뉴스 확인하기" : "확인하기"}</button>
        </div>
      </div>
    </div>
  );
}
