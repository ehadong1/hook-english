
/* ============================================================================
   SECTION 4. 음성 엔진 (TTS 품질 개선 + STT)

   브라우저 기본 voice는 대부분 기기 내장 저품질 엔진입니다. 품질 순서:
     1) 클라우드 뉴럴 TTS (ElevenLabs / Azure Neural)  ← setNeuralTTSProvider로 연결
     2) OS 온라인 뉴럴 (Microsoft "Natural", Google US English)
     3) OS 프리미엄 로컬 (macOS Ava/Samantha Premium)
     4) 기본 로컬 보이스 (가장 기계적)
   아래 로직이 2~3순위를 자동 선택합니다.
   ============================================================================ */

export const VOICE_PREFERENCE = [
  "Microsoft Ava Online (Natural) - English (United States)",
  "Microsoft Andrew Online (Natural) - English (United States)",
  "Microsoft Emma Online (Natural) - English (United States)",
  "Microsoft Brian Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Google US English",
  "Ava (Premium)", "Samantha (Enhanced)", "Allison (Enhanced)",
  "Ava", "Samantha", "Alex",
];

export let cachedVoices: SpeechSynthesisVoice[] = [];
export let neuralProvider: ((text: string) => Promise<string>) | null = null;
export let currentAudio: HTMLAudioElement | null = null;

/** 고품질 클라우드 TTS 연결 훅 (연결되면 자동 우선 사용) */
export function setNeuralTTSProvider(fn: (text: string) => Promise<string>) { neuralProvider = fn; }
export function hasNeuralProvider() { return typeof neuralProvider === "function"; }

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const pick = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return false;
      const scored = all
        .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"))
        .map((v) => {
          let score = 0;
          const idx = VOICE_PREFERENCE.indexOf(v.name);
          if (idx >= 0) score += 1000 - idx * 10;
          if (/natural|neural|premium|enhanced/i.test(v.name)) score += 300;
          if (v.localService === false) score += 200;
          if (v.lang === "en-US") score += 100;
          if (/compact|eloquence|novelty|whisper|bells|bad news/i.test(v.name)) score -= 500;
          return { v, score };
        })
        .sort((a, b) => b.score - a.score);
      cachedVoices = scored.map((s) => s.v);
      resolve(cachedVoices);
      return true;
    };
    if (pick()) return;
    window.speechSynthesis.onvoiceschanged = () => pick();
    setTimeout(() => resolve(cachedVoices), 1200);
  });
}

export type SpeakOptions = {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  loopRef?: { current: boolean };
  onEnd?: () => void;
  onStart?: () => void;
};

export async function speak(text: string, opts: SpeakOptions = {}) {
  const { voice, rate = 0.92, loopRef, onEnd, onStart } = opts;
  stopSpeaking();

  if (neuralProvider) {
    try {
      const url = await neuralProvider(text);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onplay = () => onStart && onStart();
      audio.onended = () => {
        currentAudio = null;
        if (loopRef && loopRef.current) speak(text, opts);
        else onEnd && onEnd();
      };
      await audio.play();
      return;
    } catch { /* 브라우저 TTS로 폴백 */ }
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd && onEnd(); return; }
  if (!cachedVoices.length) await loadVoices();

  const u = new SpeechSynthesisUtterance(text);
  const chosen = voice || cachedVoices[0];
  if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else { u.lang = "en-US"; }
  u.rate = rate;   // 0.92 — 또박또박하되 부자연스럽지 않은 속도
  u.pitch = 1.0;   // 기본값 유지 (변형하면 기계음이 심해짐)
  u.volume = 1.0;
  u.onstart = () => onStart && onStart();
  u.onend = () => { if (loopRef && loopRef.current) speak(text, opts); else onEnd && onEnd(); };
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

type SRWindow = Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any };

export function isSTTSupported() {
  const w = window as SRWindow;
  return typeof window !== "undefined" && !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
export function createRecognizer(lang = "ko-KR") {
  const w = window as SRWindow;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  return r;
}
