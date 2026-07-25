import { useEffect, useState } from 'react';
import type { SentenceLesson } from '../types';
import { Button } from './Button';
import { useSpeech } from '../hooks/useSpeech';

interface ListeningScreenProps {
  lesson: SentenceLesson;
  onNext: () => void;
}

function WaveBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end justify-center gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-brand-500 ${active ? 'animate-wave' : 'h-2'}`}
          style={active ? { animationDelay: `${i * 0.12}s` } : undefined}
        />
      ))}
    </div>
  );
}

export function ListeningScreen({ lesson, onNext }: ListeningScreenProps) {
  const { speak, startLoop, stopLoop } = useSpeech();
  const [isLooping, setIsLooping] = useState(false);
  const [playingExample, setPlayingExample] = useState<string | null>(null);

  useEffect(() => () => stopLoop(), [stopLoop]);

  const toggleLoop = () => {
    if (isLooping) {
      stopLoop();
      setIsLooping(false);
    } else {
      setIsLooping(true);
      startLoop(lesson.sentence);
    }
  };

  const playExample = (id: string, sentence: string) => {
    setPlayingExample(id);
    speak(sentence, () => setPlayingExample(null));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Step 3 · 리스닝/발음</p>
        <p className="mt-1 text-sm text-gray-500">무한 반복으로 귀에 익혀 보세요</p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg shadow-gray-200/60 text-center">
        <p className="text-xl font-bold leading-relaxed text-gray-900">{lesson.sentence}</p>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="relative">
            {isLooping && (
              <div className="absolute inset-0 -m-4 rounded-full bg-brand-500/20 animate-pulse-ring" />
            )}
            <Button
              variant={isLooping ? 'danger' : 'primary'}
              size="lg"
              onClick={toggleLoop}
              className="relative min-w-[200px]"
            >
              {isLooping ? '⏹ 반복 중지' : '🔁 무한 반복 듣기'}
            </Button>
          </div>
          {isLooping && <WaveBars active />}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-lg shadow-gray-200/60">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
          <span className="text-lg">🎧</span> 안 들리는 이유 분석
        </h3>
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-3 text-sm leading-relaxed text-amber-900">
          {lesson.pronunciation.summary}
        </p>
        <ul className="space-y-2">
          {lesson.pronunciation.linkingNotes.map((note, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-600">
              <span className="mt-0.5 shrink-0 text-brand-500">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-lg shadow-gray-200/60">
        <h3 className="mb-3 font-semibold text-gray-800">유사 연음 사례 문장</h3>
        <div className="space-y-3">
          {lesson.pronunciation.examples.map((ex) => (
            <div
              key={ex.id}
              className="flex items-start gap-3 rounded-2xl bg-gray-50 p-3"
            >
              <button
                type="button"
                onClick={() => playExample(ex.id, ex.sentence)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                  playingExample === ex.id
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-white text-brand-600 shadow-sm hover:bg-brand-50'
                }`}
                aria-label="문장 듣기"
              >
                {playingExample === ex.id ? '▶' : '🔊'}
              </button>
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-gray-800">{ex.sentence}</p>
                <p className="mt-0.5 text-xs text-gray-500">{ex.phenomenon}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button fullWidth size="lg" onClick={() => { stopLoop(); onNext(); }}>
        실전 연습하기 →
      </Button>
    </div>
  );
}
