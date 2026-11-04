import { useState } from "react";
import { Anchor, RefreshCw } from "lucide-react";
import { SpeakButton } from "./common";

// 비즈니스 영어에서 쓰는 "hook" 표현 모음 (Hook English의 정체성). 하루에 하나씩 바뀌고, 눌러서 다음 표현도 볼 수 있어요.
const HOOK_TIPS = [
  { phrase: "hook up (with)", meaning: "연결해 주다 · 소개해 주다", en: "Let me hook you up with our sales lead.", ko: "영업 담당자와 연결해 드릴게요." },
  { phrase: "be on the hook for", meaning: "~에 대한 책임을 지다", en: "I'm on the hook for the Q4 numbers.", ko: "4분기 실적은 제가 책임지고 있어요." },
  { phrase: "off the hook", meaning: "책임·부담에서 벗어난", en: "Thanks for covering the demo. You're off the hook.", ko: "데모를 맡아줘서 고마워요. 이제 부담 덜었어요." },
  { phrase: "a hook (opening line)", meaning: "상대의 관심을 사로잡는 첫 한마디", en: "We need a stronger hook for the opening slide.", ko: "첫 슬라이드에는 더 강한 한마디가 필요해요." },
  { phrase: "get hooked on", meaning: "~에 푹 빠지다", en: "Our customers get hooked on the free trial.", ko: "고객들이 무료 체험에 푹 빠져요." },
  { phrase: "hook (someone) in", meaning: "관심을 끌어 붙잡다", en: "A short demo can hook them in within a minute.", ko: "짧은 시연으로 1분 안에 관심을 끌 수 있어요." },
];

export function HookTip() {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const [i, setI] = useState(dayIndex % HOOK_TIPS.length);
  const t = HOOK_TIPS[i];
  return (
    <section className="mt-4 rounded-2xl border border-accent-300/60 bg-accent-50 p-3.5" aria-label="오늘의 Hook 표현">
      <div className="flex items-center justify-between">
        <p className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: "#8a6420" }}>
          <Anchor size={14} /> 오늘의 Hook 표현
        </p>
        <button type="button" onClick={() => setI((n) => (n + 1) % HOOK_TIPS.length)} className="text-xs text-gray-600 flex items-center gap-1" aria-label="다른 Hook 표현 보기">
          <RefreshCw size={12} /> 다른 표현
        </button>
      </div>
      <p className="mt-2 text-base font-bold text-gray-900">{t.phrase}</p>
      <p className="text-xs text-gray-600 mt-0.5">{t.meaning}</p>
      <div className="mt-2 flex items-start justify-between gap-2 bg-white/80 rounded-xl px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 break-words">{t.en}</p>
          <p className="text-xs text-gray-500 mt-0.5 break-words">{t.ko}</p>
        </div>
        <SpeakButton text={t.en} size={18} />
      </div>
    </section>
  );
}
