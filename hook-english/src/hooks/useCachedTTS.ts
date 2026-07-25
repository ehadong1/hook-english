import { useCallback, useRef, useState } from 'react';
import { playCachedSpeech, stopSpeech } from '@/services/tts/ttsService';

export function useCachedTTS() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastSource, setLastSource] = useState<'local' | 'remote' | 'generated' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loopRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await playCachedSpeech({
        text,
        onStart: () => {
          setIsPlaying(true);
          setIsLoading(false);
        },
        onEnd: () => {
          setIsPlaying(false);
          if (loopRef.current) {
            void speak(text);
          }
        },
        onError: (message) => setError(message),
      });
      setLastSource(result.source);
    } catch (e) {
      setIsLoading(false);
      setIsPlaying(false);
      setError(e instanceof Error ? e.message : 'TTS 재생 오류');
    }
  }, []);

  const startLoop = useCallback(
    (text: string) => {
      loopRef.current = true;
      void speak(text);
    },
    [speak],
  );

  const stopLoop = useCallback(async () => {
    loopRef.current = false;
    setIsPlaying(false);
    await stopSpeech();
  }, []);

  return {
    speak,
    startLoop,
    stopLoop,
    isLoading,
    isPlaying,
    lastSource,
    error,
  };
}
