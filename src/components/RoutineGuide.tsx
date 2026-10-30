import { useState } from "react";
import { ChevronDown, ChevronUp, Repeat, Target } from "lucide-react";

export type TabKey = "main" | "training" | "scoring" | "review" | "roleplay";

type Step = { title: string; desc: string; tab: TabKey; where: string };

// Hook English의 반복 학습 루틴. 앱의 모든 기능이 이 순서에 맞춰 배치되어 있습니다.
const STEPS: Step[] = [
  { title: "문장 고르기", desc: "알고 싶은 문장 입력·선택", tab: "main", where: "메인" },
  { title: "이해하기", desc: "원어민 표현 · 구조 · 문법", tab: "main", where: "메인" },
  { title: "따라 읽기", desc: "듣고 · 말하고 · 반복", tab: "training", where: "리스닝" },
  { title: "써 보기", desc: "일기 · 문장 만들기", tab: "main", where: "메인" },
  { title: "대화하기", desc: "실전 대화로 말해 보기", tab: "roleplay", where: "실전대화" },
  { title: "복습하기", desc: "수집한 문장 다시 보기", tab: "review", where: "복습" },
  { title: "다시 쓰기", desc: "실전 대화에서 재활용", tab: "roleplay", where: "실전대화" },
];

const GOAL = 1000;

export function RoutineGuide({ savedCount, onGo }: { savedCount: number; onGo: (tab: TabKey) => void }) {
  // 처음 방문하면 순서를 펼쳐서 보여주고, 한 번 닫으면 다음부터는 접어 둡니다.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("hook_guide_seen") !== "1" && savedCount === 0; } catch { return false; }
  });
  const toggle = () => {
    setOpen((o) => {
      if (o) { try { localStorage.setItem("hook_guide_seen", "1"); } catch { /* 무시 */ } }
      return !o;
    });
  };
  const [sel, setSel] = useState(0);
  const pct = Math.min(100, Math.round((savedCount / GOAL) * 100));

  return (
    <section className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3.5" aria-label="Hook 학습 루틴">
      <button
        type="button"
        onClick={toggle}
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
        <div className="mt-3">
          {/* 가로 단계 바: 1~7을 한 줄로, 끝에서 다시 1로 돌아가는 순환 표시 */}
          <ol className="flex items-center" aria-label="학습 7단계">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  aria-label={`${i + 1}단계 ${s.title}`}
                  aria-current={sel === i ? "step" : undefined}
                  className={`shrink-0 w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center border-2 transition ${
                    sel === i ? "bg-brand-600 border-brand-600 text-white scale-110" : "bg-white border-brand-200 text-brand-700"
                  }`}
                >
                  {i + 1}
                </button>
                {i < STEPS.length - 1 && <span className="flex-1 h-0.5 bg-brand-200 mx-0.5" aria-hidden="true" />}
              </li>
            ))}
            <span className="ml-1 shrink-0 w-8 h-8 rounded-full bg-accent-50 text-accent-600 flex items-center justify-center" title="다시 1번으로 돌아가 반복" aria-hidden="true">
              <Repeat size={16} />
            </span>
          </ol>

          <div className="mt-3 rounded-xl bg-white px-3.5 py-3">
            <p className="text-xs font-bold text-brand-500">{sel + 1}단계 · {STEPS[sel].where}</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">{STEPS[sel].title}</p>
            <p className="text-sm text-gray-600 mt-0.5">{STEPS[sel].desc}</p>
            <button
              type="button"
              onClick={() => onGo(STEPS[sel].tab)}
              className="mt-2.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold"
            >
              {STEPS[sel].where}(으)로 가기
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-700 text-center">7단계 후 다음 문장으로 다시 반복</p>
        </div>
      )}
    </section>
  );
}
