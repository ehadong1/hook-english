import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Repeat, Target } from "lucide-react";

export type TabKey = "main" | "training" | "scoring" | "review" | "roleplay";

type Step = { title: string; desc: string };

// Hook English의 반복 학습 루틴. 1~4: 학습(새 문장 익히기), 5~7: 반복(내 것으로 만들기)
const STEPS: Step[] = [
  { title: "알고 싶은 문장을 학습해요", desc: "한글로 쓰거나 추천 문장을 골라요" },
  { title: "원어민 표현·구조·문법을 이해해요", desc: "'구조 및 해설 보기'로 왜 이렇게 쓰는지 확인해요" },
  { title: "여러 번 읽고 따라 해요", desc: "듣고, 따라 말하고, 내 목소리와 비교해요" },
  { title: "일기나 문장 만들기로 써봐요", desc: "배운 문장을 내 상황에 넣어서 직접 써요" },
  { title: "실전 대화로 익혀요", desc: "저장한 문장을 대화 속에서 직접 말해요" },
  { title: "시간이 지난 뒤 수집첩에서 복습해요", desc: "잊을 때쯤 복습 탭이 알려줘요" },
  { title: "실전 대화에서 다시 활용해요", desc: "누적한 문장으로 더 길게 말해요" },
];
const N = STEPS.length;
const LEARN = 4; // 앞의 4단계는 '학습', 나머지는 '반복'

const GOAL = 1000;
const LEARN_COLOR = "#1a3556"; // 남색
const REPEAT_COLOR = "#8a6420"; // 황동(글자 대비를 위해 어둡게)
const LEARN_SOFT = "#e6edf6";
const REPEAT_SOFT = "#f6ecda";

const CARD_H = 104; // px
const STRIP = 28; // 뒤 카드가 보이는 간격(px)
const AUTO_MS = 4300;

const colorOf = (i: number) => (i < LEARN ? LEARN_COLOR : REPEAT_COLOR);
const tagOf = (i: number) => (i < LEARN ? `학습 ${i + 1}/${LEARN}` : `반복 ${i - LEARN + 1}/${N - LEARN}`);

export function RoutineGuide({ savedCount }: { savedCount: number; onGo?: (tab: TabKey) => void }) {
  // 처음 방문하면 펼쳐서 보여주고, 한 번 접으면 다음부터는 접어 둡니다.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem("hook_guide_seen") !== "1" && savedCount === 0; } catch { return false; }
  });
  const toggle = () => {
    setOpen((o) => {
      if (o) { try { localStorage.setItem("hook_guide_seen", "1"); } catch { /* 무시 */ } }
      return !o;
    });
  };

  const [cur, setCur] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null); // 빠져나가는 카드
  const [snap, setSnap] = useState<number | null>(null); // 애니메이션 없이 맨 뒤로 보낼 카드
  const busy = useRef(false);
  const pausedUntil = useRef(0);
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const advance = () => {
    if (busy.current) return;
    busy.current = true;
    const out = cur;
    setLeaving(out);
    window.setTimeout(() => {
      setSnap(out);
      setCur((c) => (c + 1) % N);
      setLeaving(null);
      window.setTimeout(() => { setSnap(null); busy.current = false; }, 60);
    }, reduceMotion ? 0 : 560);
  };

  // 자동으로 넘김 (움직임 줄이기 설정이면 자동 넘김 없음)
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  useEffect(() => {
    if (!open || reduceMotion) return;
    const t = window.setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      advanceRef.current();
    }, AUTO_MS);
    return () => window.clearInterval(t);
  }, [open, reduceMotion]);

  const onDeckTap = () => {
    pausedUntil.current = Date.now() + 7000;
    advance();
  };

  const pct = Math.min(100, Math.round((savedCount / GOAL) * 100));
  const deckH = CARD_H + (N - 1) * STRIP;

  return (
    <section className="mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-3.5" aria-label="Hook 학습 루틴">
      <button type="button" onClick={toggle} aria-expanded={open} className="w-full flex items-center gap-2 text-left">
        <Target size={18} className="text-brand-600 shrink-0" />
        <span className="flex-1">
          <span className="block text-sm font-bold text-brand-800">하루 3문장, 1년이면 1,000문장</span>
          <span className="block text-xs text-brand-700 mt-0.5">
            지금까지 저장한 문장 <b>{savedCount}</b> / {GOAL.toLocaleString("ko-KR")}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand-700">{open ? "접기" : "활용법 보기"}</span>
        {open ? <ChevronUp size={18} className="text-brand-600" /> : <ChevronDown size={18} className="text-brand-600" />}
      </button>

      <div className="mt-2.5 h-2 rounded-full bg-white overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={GOAL} aria-valuenow={savedCount}>
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.max(pct, savedCount > 0 ? 2 : 0)}%` }} />
      </div>

      {open && (
        <div className="mt-3">
          {/* 화면 낭독기용 전체 목록 */}
          <ol className="sr-only">
            {STEPS.map((s, i) => (
              <li key={i}>{tagOf(i)}: {s.title}. {s.desc}</li>
            ))}
          </ol>

          {/* 카드 줄: 맨 앞 카드가 지금 단계, 뒤로 2~7번이 차례로 줄서 있어요 */}
          <div
            role="button"
            tabIndex={0}
            aria-label="다음 단계 카드 보기"
            onClick={onDeckTap}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDeckTap(); } }}
            className="relative w-full select-none cursor-pointer"
            style={{ height: deckH }}
            aria-hidden={false}
          >
            {STEPS.map((s, i) => {
              const d = (i - cur + N) % N;
              const isLeaving = leaving === i;
              const col = colorOf(i);
              const transform = isLeaving
                ? "translateY(70px) scale(0.92)"
                : `translateY(${-d * STRIP}px) scale(${1 - d * 0.03})`;
              const opacity = isLeaving ? 0 : d === 0 ? 1 : Math.max(0.72 - d * 0.08, 0.3);
              return (
                <div
                  key={i}
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-0 bg-white rounded-xl box-border px-3.5 py-1.5"
                  style={{
                    height: CARD_H,
                    border: `1.5px solid ${col}`,
                    zIndex: 100 - d,
                    transform,
                    opacity,
                    transformOrigin: "50% 100%",
                    transition: snap === i || reduceMotion ? "none" : "transform .6s ease, opacity .6s ease",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 w-[22px] h-[22px] rounded-full text-white text-[13px] font-bold flex items-center justify-center" style={{ background: col }}>{i + 1}</span>
                    <span className="flex-1 text-[15px] font-bold text-gray-900 leading-snug">{s.title}</span>
                    <span className="shrink-0 text-xs font-bold" style={{ color: col }}>{tagOf(i)}</span>
                  </div>
                  <p className="mt-3 ml-[30px] text-sm leading-snug text-gray-600">{s.desc}</p>
                </div>
              );
            })}
          </div>

          {/* 학습 → 반복 진행 바 */}
          <div className="mt-3 flex items-stretch gap-1.5">
            <div className="rounded-lg px-2 py-1.5" style={{ flex: LEARN, background: LEARN_SOFT }}>
              <p className="text-xs font-bold mb-1" style={{ color: LEARN_COLOR }}>학습 · 새 문장 익히기</p>
              <div className="flex gap-1">
                {STEPS.slice(0, LEARN).map((_, i) => (
                  <span key={i} className="flex-1 h-2 rounded" style={{ background: i === cur ? LEARN_COLOR : "#b9c8dc" }} />
                ))}
              </div>
            </div>
            <div className="flex items-center text-gray-500" aria-hidden="true"><ArrowRight size={16} /></div>
            <div className="rounded-lg px-2 py-1.5" style={{ flex: N - LEARN, background: REPEAT_SOFT }}>
              <p className="text-xs font-bold mb-1" style={{ color: REPEAT_COLOR }}>반복 · 내 것으로 만들기</p>
              <div className="flex gap-1">
                {STEPS.slice(LEARN).map((_, j) => (
                  <span key={j} className="flex-1 h-2 rounded" style={{ background: j + LEARN === cur ? REPEAT_COLOR : "#e3cfa3" }} />
                ))}
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs text-brand-800 text-center leading-relaxed">
            <Repeat size={13} className="inline -mt-0.5 mr-1" aria-hidden="true" />
            매일 새 문장으로 학습과 반복을 돌리면, 쌓인 문장은 익힐 수밖에 없어요
          </p>
        </div>
      )}
    </section>
  );
}
