import { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";

export type TabKey = "main" | "training" | "scoring" | "review" | "roleplay";

type Step = { title: string; desc: string; tab: TabKey; where: string };

// Hook English의 반복 학습 루틴. 앱의 모든 기능이 이 순서에 맞춰 배치되어 있습니다.
const STEPS: Step[] = [
  { title: "알고 싶은 문장을 학습해요", desc: "한글로 쓰거나 추천 문장을 골라요", tab: "main", where: "메인" },
  { title: "원어민 표현·구조·문법을 이해해요", desc: "'구조 및 해설 보기'로 왜 이렇게 쓰는지 확인해요", tab: "main", where: "메인" },
  { title: "여러 번 읽고 따라 해요", desc: "듣고, 따라 말하고, 내 목소리와 비교해요", tab: "training", where: "리스닝·발음" },
  { title: "일기나 문장 만들기로 써봐요", desc: "배운 문장을 내 상황에 넣어서 직접 써요", tab: "main", where: "메인 > 학습 메뉴" },
  { title: "실전 대화로 익혀요", desc: "저장한 문장을 대화 속에서 직접 말해요", tab: "roleplay", where: "실전대화" },
  { title: "시간이 지난 뒤 수집첩에서 복습해요", desc: "잊을 때쯤 복습 탭이 알려줘요", tab: "review", where: "복습" },
  { title: "실전 대화에서 다시 활용해요", desc: "누적한 문장으로 더 길게 말해요", tab: "roleplay", where: "실전대화" },
];

const GOAL = 1000;

export function RoutineGuide({ savedCount, onGo }: { savedCount: number; onGo: (tab: TabKey) => void }) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, Math.round((savedCount / GOAL) * 100));

  return (
    <section className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3.5" aria-label="Hook 학습 루틴">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-left"
      >
        <Target size={18} className="text-brand-600 shrink-0" />
        <span className="flex-1">
          <span className="block text-sm font-bold text-brand-800">하루 3문장, 1년이면 1,000문장</span>
          <span className="block text-xs text-brand-700 mt-0.5">
            지금까지 저장한 문장 <b>{savedCount}</b> / {GOAL.toLocaleString("ko-KR")}
          </span>
        </span>
        {open ? <ChevronUp size={18} className="text-brand-600" /> : <ChevronDown size={18} className="text-brand-600" />}
      </button>

      <div className="mt-2.5 h-2 rounded-full bg-white overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={savedCount}>
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.max(pct, savedCount > 0 ? 2 : 0)}%` }} />
      </div>

      {open && (
        <ol className="mt-3 space-y-1.5">
          {STEPS.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onGo(s.tab)}
                className="w-full flex items-start gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left active:bg-brand-50"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-gray-900">{s.title}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{s.desc}</span>
                </span>
                <span className="shrink-0 text-xs text-brand-500 font-semibold mt-0.5">{s.where}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
