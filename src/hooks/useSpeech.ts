import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export function useSpeech() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const loopRef = useRef(false);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onend = () => onEnd?.();
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startLoop = useCallback(
    (text: string) => {
      loopRef.current = true;
      const loop = () => {
        if (!loopRef.current) return;
        speak(text, () => {
          if (loopRef.current) {
            setTimeout(loop, 400);
          }
        });
      };
      loop();
    },
    [speak],
  );

  const stopLoop = useCallback(() => {
    loopRef.current = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => () => stopLoop(), [stopLoop]);

  return { speak, startLoop, stopLoop };
}

export function useSpeechRecognition() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startRecording = useCallback((onComplete?: (text: string) => void) => {
    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor })
        .SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const fallback = '(브라우저가 음성 인식을 지원하지 않습니다. 텍스트로 연습해 보세요.)';
      setTranscript(fallback);
      onComplete?.(fallback);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const result = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(result);
      onComplete?.(result);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, transcript, startRecording, stopRecording, setTranscript };
}
