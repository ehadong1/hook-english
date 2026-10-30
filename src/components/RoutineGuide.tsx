import { useState } from "react";
import { ChevronDown, ChevronUp, Repeat, Target } from "lucide-react";

export type TabKey = "main" | "training" | "scoring" | "review" | "roleplay";

type Step = { label: string; desc: string; tab: TabKey };

// Hook English의 반복 학습 루틴. 한눈에 보이도록 짧은 키워드만 씁니다.
const STEPS: Step[] = [
  { label: "고르기", desc: "알고 싶은 문장 입력·선택", tab: "main" },
  { label: "이해하기", desc: "원어민 표현 · 구조 · 문법", tab: "main" },
  { label: "따라 읽기", desc: "듣고 · 말하고 · 반복", tab: "training" },
  { label: "써 보기", desc: "일기 · 문장 만들기", tab: "main" },
  { label: "대화하기", desc: "실전 대화로 말해 보기", tab: "roleplay" },
  { label: "복습하기", desc: "수집한 문장 다시 보기", tab: "review" },
  { label: "다시 쓰기", desc: "실전 대화에서 재활용", tab: "roleplay" },
];

const GOAL = 1000;

// 원형 배치용 좌표 (viewBox 와 같은 343 x 300 기준)
const W = 343, H = 300, CX = W / 2, CY = H / 2, RX = 124, RY = 112;
const N = STEPS.length;
const angleOf = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / N; // 위에서 시작, 시계 방향
const pointAt = (t: number) => ({ x: CX + RX * Math.cos(t), y: CY + RY * Math.sin(t) });

// 단계 사이에 놓는 방향 화살표 (타원 접선 방향으로 회전)
const ARROWS = STEPS.map((_, i) => {
  const t = angleOf(i) + Math.PI / N;
  const { x, y } = pointAt(t);
  const deg = (Math.atan2(RY * Math.cos(t), -RX * Math.sin(t)) * 180) / Math.PI;
  return { x, y, deg };
});

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
          {/* 원형 순환 그림: 1→7을 한눈에, 7 다음에는 다시 1로 */}
          <div className="relative w-full mx-auto" style={{ aspectRatio: `${W} / ${H}`, maxWidth: W }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
              <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" className="stroke-brand-200" strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
              {ARROWS.map((a, i) => (
                <polygon
                  key={i}
                  points="-7,-6 7,0 -7,6"
                  className="fill-brand-500"
                  transform={`translate(${a.x} ${a.y}) rotate(${a.deg})`}
                />
              ))}
            </svg>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <Repeat size={26} className="mx-auto text-accent-600" aria-hidden="true" />
              <p className="mt-1 text-sm font-bold text-brand-800 leading-tight">하루 3문장</p>
              <p className="text-xs text-brand-700 leading-tight">계속 반복</p>
            </div>

            {STEPS.map((s, i) => {
              const { x, y } = pointAt(angleOf(i));
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => onGo(s.tab)}
                  aria-label={`${i + 1}단계 ${s.label}: ${s.desc}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 h-11 pl-1.5 pr-2.5 rounded-full bg-white border border-brand-200 shadow-sm whitespace-nowrap active:bg-brand-50"
                  style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-bold text-gray-900">{s.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-brand-700 text-center">눌러서 해당 화면으로 갈 수도 있어요</p>
        </div>
      )}
    </section>
  );
}
