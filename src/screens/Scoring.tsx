import { useState, useRef } from "react";
import { Volume2, Mic, Square, Lock, Headphones } from "lucide-react";
import { SpeakButton } from "../components/common";
import { speak } from "../lib/speech";

/* ============================================================================
   SECTION 11. 발음 연습 (따라 말하기 + 내 목소리 비교)
   ============================================================================ */

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [micOk, setMicOk] = useState(true);
  const mr = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        setAudioURL(URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mr.current = rec;
      setRecording(true);
    } catch { setMicOk(false); setRecording(true); }
  };
  const stop = () => { if (mr.current?.state === "recording") mr.current.stop(); setRecording(false); };
  return { recording, audioURL, micOk, start, stop };
}

export function ScoringTab({ sentence, voice }: { sentence: { text: string }; voice?: SpeechSynthesisVoice | null }) {
  const { recording, audioURL, micOk, start, stop } = useRecorder();
  const [compare, setCompare] = useState<"me" | "native" | null>(null);

  const toggle = () => { if (recording) stop(); else start(); };

  const playCompare = () => {
    setCompare("me");
    const next = () => { setCompare("native"); speak(sentence.text, { voice, onEnd: () => setCompare(null) }); };
    if (audioURL) { const a = new Audio(audioURL); a.onended = next; a.play().catch(next); } else next();
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-gray-50 rounded-2xl p-4 mt-3 text-center">
        <p className="text-xs text-gray-500 mb-1">따라 말해볼 문장</p>
        <p className="font-bold text-gray-900">{sentence.text}</p>
        <div className="flex justify-center mt-2"><SpeakButton text={sentence.text} /></div>
      </div>

      <ol className="mt-4 space-y-1.5 text-xs text-gray-600">
        <li className="flex gap-2"><span className="font-bold text-brand-600">1</span> 원어민 소리를 먼저 들어요</li>
        <li className="flex gap-2"><span className="font-bold text-brand-600">2</span> 녹음 버튼을 누르고 따라 말해요</li>
        <li className="flex gap-2"><span className="font-bold text-brand-600">3</span> 내 목소리와 원어민을 번갈아 들으며 비교해요</li>
      </ol>

      {!micOk && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">마이크 권한이 없어 녹음할 수 없어요. 브라우저 주소창의 마이크 설정에서 허용해 주세요.</p>}

      <button type="button" onClick={toggle} className={`w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white ${recording ? "bg-rose-500 animate-pulse" : "bg-brand-600"}`}>
        {recording ? <Square size={18} /> : <Mic size={18} />}
        {recording ? "녹음 중지" : audioURL ? "다시 녹음하기" : "녹음 시작"}
      </button>

      {audioURL && !recording && (
        <div className="mt-4 space-y-3">
          <audio controls src={audioURL} className="w-full" aria-label="내 녹음 듣기" />
          <button type="button" onClick={playCompare} disabled={compare !== null} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60">
            <Volume2 size={16} />
            {compare === "me" ? "내 목소리 재생 중..." : compare === "native" ? "원어민 목소리 재생 중..." : "내 목소리 → 원어민 이어서 듣기"}
          </button>
        </div>
      )}

      <div className="mt-6 border border-dashed border-gray-300 rounded-2xl p-4 bg-white">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock size={15} className="text-gray-400" />
          <p className="text-sm font-bold text-gray-800">AI 발음 평가</p>
          <span className="ml-auto text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">유료 멤버 · 준비 중</span>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          단어·소리별 정확도 점수와 약한 발음 교정 팁을 제공할 예정이에요. 지금은 실제 평가가 아니라서 점수를 보여주지 않아요.
        </p>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Headphones size={12} /> 그때까지는 위 비교 듣기로 연습해 보세요.</p>
      </div>
    </div>
  );
}
