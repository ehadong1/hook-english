import { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, Repeat } from "lucide-react";
import { SpeakButton, renderHighlighted } from "../components/common";
import { speak, stopSpeaking } from "../lib/speech";
import type { Sentence } from "../types";

/* ============================================================================
   SECTION 10. 리스닝 & 소리 훈련
   ============================================================================ */

export function SoundBreakdown({ sentence }: { sentence: Sentence }) {
  const s = sentence.sound;
  if (!s) return null;
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold text-amber-700">소리 규칙 해부 · 연음과 강세</p>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{s.title}</span>
      </div>
      <div className="bg-white rounded-lg px-3 py-2 mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-amber-700">{s.pattern}</p>
        <SpeakButton text={sentence.text} size={16} className="text-amber-600" />
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{s.note}</p>

      <p className="text-xs font-bold text-amber-600 mt-3 mb-1.5">같은 규칙이 적용된 실제 대화 문장</p>
      <div className="space-y-1.5">
        {s.examples.map((ex: { en: string; ko: string }, i: number) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-gray-800">{renderHighlighted(ex.en)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ex.ko}</p>
            </div>
            <SpeakButton text={ex.en.replace(/\*\*/g, "")} size={16} className="text-amber-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InfiniteListening({ text, voice }: { text: string; voice?: SpeechSynthesisVoice | null }) {
  const [looping, setLooping] = useState(false);
  const loopRef = useRef(false);

  useEffect(() => {
    loopRef.current = looping;
    if (looping) speak(text, { voice, loopRef });
    else stopSpeaking();
    return () => { loopRef.current = false; stopSpeaking(); };
  }, [looping, text]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 mt-3">
      <p className="text-xs font-bold text-gray-400 mb-2">무한 반복 듣기</p>
      <button onClick={() => setLooping((l) => !l)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-brand-600 text-white font-semibold relative overflow-hidden">
        {looping && <span className="absolute inset-0 bg-white/20 animate-pulse" />}
        <Repeat size={17} className={looping ? "animate-spin" : ""} />
        {looping ? "반복 재생 중 · 탭하여 정지" : "원어민 음성 무한 반복"}
      </button>
    </div>
  );
}

export function FadingTrainer({ sentence }: { sentence: Sentence }) {
  const words = useMemo(() => sentence.text.split(" "), [sentence]);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const percents = [0, 0.3, 0.7, 1];
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const blanked = useMemo(() => {
    const count = Math.round(words.length * percents[stage]);
    return new Set([...words.keys()].sort((a, b) => b - a).slice(0, count));
  }, [stage, words]);

  useEffect(() => {
    if (running) timer.current = setInterval(() => setStage((s) => (s + 1) % 4), 2400);
    else if (timer.current) clearInterval(timer.current);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [running]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400">Fading 암기 훈련</p>
        <span className="text-xs text-brand-600 font-semibold">{Math.round(percents[stage] * 100)}% 가림</span>
      </div>
      <p className="text-base leading-relaxed font-medium text-gray-900 min-h-[3.5rem]">
        {words.map((w: string, i: number) => (
          <span key={i} className={`mr-1.5 ${blanked.has(i) ? "text-brand-300" : ""}`}>{blanked.has(i) ? "____" : w}</span>
        ))}
      </p>
      <button onClick={() => setRunning((r) => !r)} className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold ${running ? "bg-gray-100 text-gray-600" : "bg-brand-600 text-white"}`}>
        {running ? <Pause size={15} /> : <Play size={15} />}
        {running ? "순환 정지" : "무한 순환 시작 (30 → 70 → 100%)"}
      </button>
    </div>
  );
}

export function TrainingTab({ sentence, voice }: { sentence: Sentence; voice?: SpeechSynthesisVoice | null }) {
  return (
    <div className="px-4 pb-6">
      <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-2xl p-4 text-white mt-3">
        <p className="text-xs opacity-80 mb-1">훈련 문장</p>
        <p className="text-lg font-bold leading-snug">{sentence.text}</p>
        <p className="text-xs opacity-70 mt-1">{sentence.translation}</p>
      </div>
      <InfiniteListening text={sentence.text} voice={voice} />
      <FadingTrainer sentence={sentence} />
      <SoundBreakdown sentence={sentence} />
    </div>
  );
}
