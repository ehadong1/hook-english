import { useRef } from 'react';
import type { UserProfile } from '../types';
import {
  INTEREST_OPTIONS,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  assessSkillProfile,
} from '../data/personalization';
import { Button } from './Button';

interface StartScreenProps {
  profile: UserProfile;
  onStart: (sentence: string) => void;
  onDailyStart: () => void;
  onRetakeSurvey: () => void;
}

export function StartScreen({ profile, onStart, onDailyStart, onRetakeSurvey }: StartScreenProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const assessment = assessSkillProfile(profile);

  const handleStart = () => {
    const value = inputRef.current?.value.trim();
    if (value) onStart(value);
  };

  const interestLabels = profile.interests
    .map((id) => INTEREST_OPTIONS.find((o) => o.id === id))
    .filter(Boolean);

  const focusLabels = profile.weakAreas
    .map((id) => FOCUS_OPTIONS.find((o) => o.id === id))
    .filter(Boolean);

  const goalLabel = GOAL_OPTIONS.find((o) => o.id === profile.goal);

  return (
    <div className="flex flex-col gap-5">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-lg shadow-brand-600/30">
          🔁
        </div>
        <h1 className="text-2xl font-bold text-gray-900">RepeatFlow</h1>
        <p className="mt-1 text-sm text-gray-500">맞춤 추천으로 학습을 시작하세요</p>
      </header>

      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white shadow-lg shadow-brand-600/25">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-brand-100">내 학습 프로필</p>
            <p className="mt-1 text-lg font-bold">{assessment.levelLabel}</p>
            <p className="mt-0.5 text-xs text-brand-100">{assessment.levelDescription}</p>
          </div>
          <button
            type="button"
            onClick={onRetakeSurvey}
            className="rounded-xl bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"
          >
            수정
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {interestLabels.map((opt) => (
            <span key={opt!.id} className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {opt!.emoji} {opt!.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-brand-100">
          목표: {goalLabel?.emoji} {goalLabel?.label} · 보완: {focusLabels.map((f) => f!.label).join(', ')}
        </p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-lg shadow-gray-200/60">
        <label htmlFor="sentence-input" className="mb-2 block text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
          학습할 문장
        </label>
        <textarea
          ref={inputRef}
          id="sentence-input"
          placeholder="예: I learned something new today."
          className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-base text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleStart();
            }
          }}
        />
        <Button fullWidth size="lg" className="mt-4" onClick={handleStart}>
          학습 시작 →
        </Button>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-lg shadow-gray-200/60">
        <p className="mb-1 text-left text-sm font-medium text-gray-800">
          ✨ 나에게 맞춘 오늘의 3문장
        </p>
        <p className="mb-3 text-left text-xs text-gray-500">
          {assessment.levelLabel} · {interestLabels.slice(0, 2).map((i) => i!.label).join('·')} ·{' '}
          {focusLabels[0]?.label} 중심
        </p>
        <Button fullWidth variant="secondary" size="lg" onClick={onDailyStart}>
          맞춤 3문장 받기
        </Button>
      </div>
    </div>
  );
}
