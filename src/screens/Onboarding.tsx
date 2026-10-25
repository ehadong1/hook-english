import { useState, type CSSProperties, type ReactNode } from "react";
import { Pointer } from "lucide-react";
import { SURVEY_QUESTIONS } from "../data/survey";
import { normalizeProfile } from "../lib/personalization";
import type { Profile } from "../types";

/* ============================================================================
   SECTION 8. 온보딩 (2페이지)
   - 1페이지: 영어 수준(가로 슬라이더) + 업무 영역
   - 2페이지: 학습 목적 / 어려운 점 / 주로 쓰는 상황 / 하루 시간 / 말투
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

export function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [page, setPage] = useState(0);
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

  const page1Ok = !!answers.level && (answers.topics || []).length > 0;
  const page2Ok = !!answers.purpose && (answers.weaknesses || []).length > 0 && !!answers.situation;

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 pb-8">
      <div>
        <div className="flex gap-1.5 mb-5" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={page + 1}>
          {[0, 1].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= page ? "bg-brand-600" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-xs font-bold text-brand-500">{page + 1} / 2</p>
        <h2 className="text-xl font-bold text-gray-900 mt-0.5 leading-snug">
          {page === 0 ? "나에게 맞는 학습 환경을 만들게요" : "거의 다 왔어요"}
        </h2>

        {page === 0 && (
          <>
            <Section title="현재 영어 실력은 어느 정도인가요?">
              <LevelSlider value={answers.level} onChange={(v) => set("level", v)} />
            </Section>

            <Section title="본인 업무 영역을 골라주세요" sub="여러 개 선택할 수 있어요. 해당 분야 표현을 먼저 추천해요.">
              <div className="grid grid-cols-2 gap-2">
                {Q.topics.options.map((o) => (
                  <Chip key={o.value} title={o.desc} selected={has("topics", o.value)} onClick={() => toggle("topics", o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>
          </>
        )}

        {page === 1 && (
          <>
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

            <Section title="주로 어떤 상황에서 쓰나요?">
              <div className="grid grid-cols-2 gap-2">
                {Q.situation.options.map((o) => (
                  <Chip key={o.value} title={o.desc} selected={answers.situation === o.value} onClick={() => set("situation", o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title="하루 학습 시간" sub="추천 문장 개수를 맞춰요. 나중에 바꿀 수 있어요.">
              <div className="grid grid-cols-3 gap-2">
                {Q.dailyTime.options.map((o) => (
                  <Chip key={o.value} selected={answers.dailyTime === o.value} onClick={() => set("dailyTime", o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>

            <Section title="익히고 싶은 말투">
              <div className="grid grid-cols-3 gap-2">
                {Q.tone.options.map((o) => (
                  <Chip key={o.value} title={o.desc} selected={answers.tone === o.value} onClick={() => set("tone", o.value)}>
                    {o.label}
                  </Chip>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>

      <div className="flex gap-2.5 mt-8">
        {page > 0 && (
          <button type="button" onClick={() => setPage(0)} className="px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">
            이전
          </button>
        )}
        <button
          type="button"
          disabled={page === 0 ? !page1Ok : !page2Ok}
          onClick={() => (page === 0 ? setPage(1) : onComplete(normalizeProfile(answers)))}
          className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${
            (page === 0 ? page1Ok : page2Ok) ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-400"
          }`}
        >
          {page === 0 ? "다음" : "내 학습 환경 만들기"}
        </button>
      </div>
    </div>
  );
}
