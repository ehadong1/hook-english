import { useState, type CSSProperties, type ReactNode } from "react";
import { Pointer } from "lucide-react";
import { SURVEY_QUESTIONS } from "../data/survey";
import { normalizeProfile } from "../lib/personalization";
import type { Profile } from "../types";

/* ============================================================================
   SECTION 8. 온보딩 (3페이지, 한 화면에 한 가지 결정)
   - 1페이지: 시작 방식 2가지(내 말부터 / 추천 문장부터)
   - 2페이지: 업무 분야(필수, 여러 개 가능)
   - 3페이지: 영어 수준(슬라이더, 필수) + 말투, 그리고 눈에 띄는 "더 정확히 맞추기"(상황·목적·어려운 점·학습 시간, 선택)
   상황은 문장마다 태그로 섞어 보여주고, 원하는 사람만 "더 정확히 맞추기"에서 고릅니다.
   답변 모양은 예전과 같아서(profile) 나머지 앱 로직은 그대로 동작합니다.
   ============================================================================ */

const Q = Object.fromEntries(SURVEY_QUESTIONS.map((q) => [q.key, q]));
const LEVELS = Q.level.options; // L1 ~ L9
const THUMB = 34; // 슬라이더 손잡이 지름(px) — index.css 와 맞춰야 채움 위치가 정확해요

function Chip({ selected, onClick, children, title }: { selected: boolean; onClick: () => void; children: ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-sm font-semibold border-2 text-left transition ${
        selected ? "bg-brand-600 border-brand-600 text-white" : "bg-gray-50 border-gray-100 text-gray-800 active:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {sub && <p className="text-sm text-gray-500 mt-0.5 mb-3">{sub}</p>}
      {!sub && <div className="mb-3" />}
      {children}
    </section>
  );
}

function LevelSlider({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [touched, setTouched] = useState(!!value);
  const n = value ? Number(value.slice(1)) : 5;
  const pct = ((n - 1) / (LEVELS.length - 1)) * 100;
  const fill = touched ? `calc(${pct}% + ${(0.5 - pct / 100) * THUMB}px)` : "0%";
  const current = LEVELS[n - 1];
  const commit = (num: number) => { setTouched(true); onChange(`L${num}`); };

  return (
    <div>
      <div className="min-h-[64px]">
        {touched ? (
          <>
            <p className="text-xl font-extrabold text-brand-700">{current.label}</p>
            <p className="text-sm text-gray-600 mt-0.5">{current.desc}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500 pt-2">아래 막대를 손가락으로 옆으로 밀어서 지금 내 영어 수준을 정해주세요.</p>
        )}
      </div>

      <div className="relative overflow-hidden">
        <input
          type="range"
          min={1}
          max={LEVELS.length}
          step={1}
          value={n}
          aria-label="현재 영어 수준 (1 입문에서 9 최상)"
          aria-valuetext={touched ? `${current.label}, ${current.desc}` : "아직 선택하지 않음"}
          className={`level-slider ${touched ? "" : "opacity-70"}`}
          style={{ "--fill": fill } as CSSProperties}
          onPointerDown={() => commit(n)}
          onChange={(e) => commit(Number(e.target.value))}
          onKeyDown={() => setTouched(true)}
        />
        {!touched && (
          <Pointer
            size={34}
            aria-hidden="true"
            className="finger-hint absolute left-1 top-3 text-brand-700 pointer-events-none drop-shadow"
          />
        )}
      </div>
      <div className="flex justify-between text-xs font-semibold text-gray-500 mt-1 px-1">
        <span>입문</span>
        <span>중급</span>
        <span>최상</span>
      </div>
    </div>
  );
}

const START_OPTIONS = [
  { value: "own", label: "내가 하고 싶은 말부터", desc: "첫 화면에 입력창이 크게 보여요. 오늘 쓸 말을 한글로 적으면 그 문장으로 배워요." },
  { value: "given", label: "추천 문장부터", desc: "첫 화면에 오늘의 추천 3문장이 바로 보여요. 하나를 눌러 시작하면 돼요." },
] as const;

function BigChoice({ selected, onClick, label, desc }: { selected: boolean; onClick: () => void; label: string; desc: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 px-4 py-3.5 transition ${selected ? "bg-brand-600 border-brand-600" : "bg-gray-50 border-gray-100 active:bg-gray-100"}`}
    >
      <span className={`block text-[15px] font-bold ${selected ? "text-white" : "text-gray-900"}`}>{label}</span>
      <span className={`block text-xs mt-0.5 ${selected ? "text-white/80" : "text-gray-500"}`}>{desc}</span>
    </button>
  );
}

const TOTAL_PAGES = 3;

export function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [page, setPage] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({
    dailyTime: "10~15분", // 기본값 (바꾸지 않아도 됨)
    tone: "중립 실무",
  });

  const set = (key: string, v: unknown) => setAnswers((a) => ({ ...a, [key]: v }));
  const toggle = (key: string, v: string) =>
    setAnswers((a) => {
      const prev = Array.isArray(a[key]) ? a[key] : [];
      return { ...a, [key]: prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v] };
    });
  const has = (key: string, v: string) => Array.isArray(answers[key]) && answers[key].includes(v);

  // 필수는 "시작 방식(+문장 종류) · 주로 쓰는 상황 · 영어 수준" 뿐이에요. 나머지는 고르지 않아도 됩니다.
  const pageOk = [
    !!answers.startMode,
    Array.isArray(answers.topics) && answers.topics.length > 0,
    !!answers.level,
  ];
  const titles = ["어떻게 시작할까요?", "어느 분야 일을 하세요?", "마지막이에요"];
  const last = page === TOTAL_PAGES - 1;

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-8">
      <div>
        <div className="flex gap-1.5 mb-5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_PAGES} aria-valuenow={page + 1}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= page ? "bg-brand-600" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-xs font-bold text-brand-500">{page + 1} / {TOTAL_PAGES}</p>
        <h2 className="text-xl font-bold text-gray-900 mt-0.5 leading-snug">{titles[page]}</h2>

        {page === 0 && (
          <>
            <p className="text-sm text-gray-500 mt-1">나중에 언제든 바꿀 수 있어요.</p>
            <div className="mt-5 space-y-2.5">
              {START_OPTIONS.map((o) => (
                <BigChoice key={o.value} selected={answers.startMode === o.value} label={o.label} desc={o.desc} onClick={() => set("startMode", o.value)} />
              ))}
            </div>
          </>
        )}

        {page === 1 && (
          <>
            <p className="text-sm text-gray-500 mt-1">그 분야 표현을 먼저 추천해요. 여러 개 골라도 돼요.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {Q.topics.options.map((o) => (
                <Chip key={o.value} title={o.desc} selected={has("topics", o.value)} onClick={() => toggle("topics", o.value)}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </>
        )}

        {page === 2 && (
          <>
            <Section title="현재 영어 실력은 어느 정도인가요?">
              <LevelSlider value={answers.level} onChange={(v) => set("level", v)} />
            </Section>

            <Section title="익히고 싶은 말투" sub="기본은 중립 실무예요.">
              <div className="grid grid-cols-3 gap-2">
                {Q.tone.options.map((o) => (
                  <Chip key={o.value} title={o.desc} selected={answers.tone === o.value} onClick={() => set("tone", o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="mt-7 w-full rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3.5 text-left flex items-center gap-3 active:bg-brand-100"
            >
              <span className="flex-1">
                <span className="block text-[15px] font-extrabold text-brand-800">더 정확히 맞추기 <span className="text-xs font-bold text-brand-500">(선택)</span></span>
                <span className="block text-xs text-brand-700 mt-0.5">자주 쓰는 상황·목적·어려운 점을 고르면 추천이 더 정교해져요</span>
              </span>
              <span className="text-brand-700 text-lg font-bold" aria-hidden="true">{showMore ? "−" : "+"}</span>
            </button>
            {showMore && (
              <>
                <Section title="주로 영어를 쓰는 상황은요?">
                  <div className="grid grid-cols-1 gap-2">
                    {Q.situation.options.map((o) => (
                      <Chip key={o.value} title={o.desc} selected={answers.situation === o.value} onClick={() => set("situation", answers.situation === o.value ? undefined : o.value)}>
                        {o.label}
                        <span className={`block text-xs font-medium mt-0.5 ${answers.situation === o.value ? "text-white/80" : "text-gray-500"}`}>{o.desc}</span>
                      </Chip>
                    ))}
                  </div>
                </Section>
                <Section title="영어를 배우는 목적은요?">
                  <div className="grid grid-cols-2 gap-2">
                    {Q.purpose.options.map((o) => (
                      <Chip key={o.value} title={o.desc} selected={answers.purpose === o.value} onClick={() => set("purpose", o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Section>
                <Section title="어려움을 느끼는 부분은요?" sub="여러 개 선택할 수 있어요.">
                  <div className="grid grid-cols-2 gap-2">
                    {Q.weaknesses.options.map((o) => (
                      <Chip key={o.value} title={o.desc} selected={has("weaknesses", o.value)} onClick={() => toggle("weaknesses", o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Section>
                <Section title="하루 학습 시간">
                  <div className="grid grid-cols-3 gap-2">
                    {Q.dailyTime.options.map((o) => (
                      <Chip key={o.value} selected={answers.dailyTime === o.value} onClick={() => set("dailyTime", o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2.5 mt-8">
        {page > 0 && (
          <button type="button" onClick={() => setPage(page - 1)} className="px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">
            이전
          </button>
        )}
        <button
          type="button"
          disabled={!pageOk[page]}
          onClick={() => (last ? onComplete(normalizeProfile(answers)) : setPage(page + 1))}
          className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${pageOk[page] ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-400"}`}
        >
          {last ? "내 학습 환경 만들기" : "다음"}
        </button>
      </div>
    </div>
  );
}
