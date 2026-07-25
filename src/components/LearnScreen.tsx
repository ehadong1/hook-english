import { useState } from 'react';
import type { FocusArea, SentenceLesson, UserProfile, VocabEntry } from '../types';
import { Button } from './Button';
import { useToast } from '../hooks/useToast';

interface LearnScreenProps {
  lesson: SentenceLesson;
  profile: UserProfile;
  onNext: () => void;
  onAddVocab: (entry: VocabEntry) => void;
}

function tokenize(sentence: string): string[] {
  return sentence.split(/(\s+|[.,!?;:'"()-]+)/).filter(Boolean);
}

function getWordHighlight(
  word: string,
  lesson: SentenceLesson,
  weakAreas: FocusArea[],
): 'focus' | 'key' | null {
  const normalized = word.replace(/[^\w']/g, '').toLowerCase();
  const entry = lesson.analysis.words.find((w) => w.word.toLowerCase() === normalized);
  if (!entry) return null;
  if (entry.focusArea && weakAreas.includes(entry.focusArea)) return 'focus';
  if (entry.isKeyForLevel) return 'key';
  return null;
}

export function LearnScreen({ lesson, profile, onNext, onAddVocab }: LearnScreenProps) {
  const [expanded, setExpanded] = useState(false);
  const { showToast } = useToast();
  const tokens = tokenize(lesson.sentence);

  const handleWordClick = (raw: string) => {
    const word = raw.replace(/[^\w']/g, '');
    if (!word || /^\d+$/.test(word)) return;

    onAddVocab({
      word: word.toLowerCase(),
      sentence: lesson.sentence,
      addedAt: Date.now(),
    });
    showToast('단어장에 추가되었습니다 ✓');
  };

  const highlightClass = (type: 'focus' | 'key' | null) => {
    if (type === 'focus') {
      return 'bg-amber-100 text-amber-900 ring-1 ring-amber-300';
    }
    if (type === 'key') {
      return 'bg-brand-100 text-brand-800';
    }
    return 'hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100';
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Step 2 · 이해</p>
        <p className="mt-1 text-sm text-gray-500">{lesson.korean}</p>
        {lesson.matchReason && (
          <p className="mt-1 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
            🎯 {lesson.matchReason}
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-lg shadow-gray-200/60">
        <p className="text-center text-2xl font-bold leading-relaxed text-gray-900">
          {tokens.map((token, i) => {
            const isWord = /\w/.test(token);
            if (!isWord) {
              return (
                <span key={i} className="text-gray-400">
                  {token}
                </span>
              );
            }
            const highlight = getWordHighlight(token, lesson, profile.weakAreas);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleWordClick(token)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleWordClick(token);
                }}
                className={`mx-0.5 inline rounded-lg px-1 py-0.5 transition-colors ${highlightClass(highlight)}`}
                title={
                  highlight === 'focus'
                    ? '보완이 필요한 영역의 핵심 단어'
                    : highlight === 'key'
                      ? '이 레벨의 핵심 단어'
                      : undefined
                }
              >
                {token}
              </button>
            );
          })}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded bg-amber-200" /> 보완 영역 단어
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded bg-brand-200" /> 핵심 단어
          </span>
        </div>
      </div>

      <div className="rounded-3xl bg-white shadow-lg shadow-gray-200/60 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="font-semibold text-gray-800">구조 및 해설 보기</span>
          <span
            className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-2 space-y-4">
            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">
                ① 문법 구조
              </h3>
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 font-mono">
                {lesson.analysis.structure}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">
                ② 핵심 단어 뜻
                <span className="ml-1 font-normal normal-case text-gray-400">(보완 영역 우선)</span>
              </h3>
              <div className="space-y-2">
                {lesson.analysis.words.map((w) => {
                  const isFocus = w.focusArea && profile.weakAreas.includes(w.focusArea);
                  return (
                    <div
                      key={w.word}
                      className={`flex items-start justify-between rounded-xl px-3 py-2 ${
                        isFocus ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-gray-50'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-gray-800">{w.word}</span>
                        <span className="ml-2 text-sm text-gray-600">{w.meaning}</span>
                        {isFocus && (
                          <span className="ml-2 text-xs text-amber-600">· 보완 추천</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">
                ③ 미국 내 사용 빈도
              </h3>
              <p className="rounded-xl bg-brand-50 px-3 py-3 text-sm leading-relaxed text-brand-900">
                {lesson.analysis.usageNote}
              </p>
              <ul className="mt-2 space-y-1">
                {lesson.analysis.words.map((w) => (
                  <li key={w.word} className="text-xs text-gray-500">
                    · <strong>{w.word}</strong>: {w.frequency}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      <Button fullWidth size="lg" onClick={onNext}>
        리스닝 훈련으로 →
      </Button>
    </div>
  );
}
