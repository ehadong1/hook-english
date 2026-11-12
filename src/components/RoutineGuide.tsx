import { ChevronRight, Target } from "lucide-react";

export type TabKey = "main" | "training" | "scoring" | "review" | "roleplay";

const GOAL = 1000;

// 진행 현황 카드. 사용법은 튜토리얼(Tutorial.tsx)이 안내하고, 여기서는 다시 보기 링크만 둡니다.
export function RoutineGuide({ savedCount, onOpenNotes }: { savedCount: number; onOpenNotes: () => void; onGo?: (tab: TabKey) => void }) {
  const pct = Math.min(100, Math.round((savedCount / GOAL) * 100));
  return (
    <section className="isolate mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3.5" aria-label="Hook 학습 현황">
      <button type="button" onClick={onOpenNotes} aria-label="나만의 영어노트 열기" className="w-full text-left active:opacity-80">
        <span className="flex items-center gap-2">
          <Target size={18} className="text-brand-600 shrink-0" />
          <span className="flex-1">
            <span className="block text-sm font-bold text-brand-800">하루 3문장, 1년이면 1,000문장</span>
            <span className="block text-xs text-brand-700 mt-0.5">
              지금까지 저장한 문장 <b>{savedCount}</b> / {GOAL.toLocaleString("ko-KR")}
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-brand-700 flex items-center">나만의 영어노트<ChevronRight size={16} /></span>
        </span>
        <span className="block mt-2.5 h-2 rounded-full bg-white overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={savedCount}>
          <span className="block h-full rounded-full bg-accent-500" style={{ width: `${Math.max(pct, savedCount > 0 ? 2 : 0)}%` }} />
        </span>
      </button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("hook-tour"))} className="mt-2 w-full text-center text-xs font-semibold text-gray-500 underline underline-offset-2">사용법 튜토리얼 다시 보기</button>
    </section>
  );
}
