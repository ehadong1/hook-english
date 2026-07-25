import { useState } from 'react';
import type {
  FocusArea,
  Interest,
  LearningGoal,
  SkillLevel,
  SkillScores,
  UserProfile,
} from '../types';
import {
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  LEVEL_OPTIONS,
  SKILL_LABELS,
  assessSkillProfile,
} from '../data/personalization';
import { Button } from './Button';

interface SurveyScreenProps {
  onComplete: (profile: UserProfile) => void;
}

const STEPS = ['관심사', '레벨', '실력', '목표', '결과'];

export function SurveyScreen({ onComplete }: SurveyScreenProps) {
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [declaredLevel, setDeclaredLevel] = useState<SkillLevel>(3);
  const [skillScores, setSkillScores] = useState<SkillScores>({
    listening: 3,
    speaking: 3,
    pronunciation: 3,
    grammar: 3,
  });
  const [weakAreas, setWeakAreas] = useState<FocusArea[]>([]);
  const [goal, setGoal] = useState<LearningGoal>('daily_chat');

  const toggleInterest = (id: Interest) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleWeakArea = (id: FocusArea) => {
    setWeakAreas((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const canNext = () => {
    if (step === 0) return interests.length > 0;
    if (step === 3) return weakAreas.length > 0 && goal !== undefined;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      const profile: UserProfile = {
        interests,
        declaredLevel,
        skillScores,
        weakAreas,
        goal,
        completedAt: Date.now(),
      };
      onComplete(profile);
    }
  };

  const draftProfile: UserProfile = {
    interests,
    declaredLevel,
    skillScores,
    weakAreas,
    goal,
    completedAt: Date.now(),
  };
  const assessment = assessSkillProfile(draftProfile);

  return (
    <div className="flex flex-col gap-5">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl shadow-lg shadow-brand-600/30">
          👋
        </div>
        <h1 className="text-xl font-bold text-gray-900">나만의 학습 프로필 만들기</h1>
        <p className="mt-1 text-sm text-gray-500">
          {step + 1} / {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-4 flex gap-1 px-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </header>

      <div className="rounded-3xl bg-white p-5 shadow-lg shadow-gray-200/60 min-h-[340px]">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">어떤 주제에 관심 있으세요?</h2>
              <p className="mt-1 text-sm text-gray-500">복수 선택 가능 · 추천 문장에 반영됩니다</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleInterest(opt.id)}
                  className={`rounded-2xl border-2 px-3 py-3 text-left transition-all ${
                    interests.includes(opt.id)
                      ? 'border-brand-500 bg-brand-50 text-brand-800'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="mt-1 block text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">현재 영어 수준은?</h2>
              <p className="mt-1 text-sm text-gray-500">솔직하게 선택해 주세요. 난이도 조절에 사용됩니다</p>
            </div>
            <div className="space-y-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDeclaredLevel(opt.value)}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    declaredLevel === opt.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                      declaredLevel === opt.value
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {declaredLevel === opt.value ? '✓' : ''}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">영역별 자가 진단</h2>
              <p className="mt-1 text-sm text-gray-500">1(매우 약함) ~ 5(매우 자신 있음)</p>
            </div>
            {SKILL_LABELS.map(({ key, label, emoji }) => (
              <div key={key}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {emoji} {label}
                  </span>
                  <span className="text-sm font-bold text-brand-600">{skillScores[key]}</span>
                </div>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as SkillLevel[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSkillScores((s) => ({ ...s, [key]: n }))}
                      className={`h-10 flex-1 rounded-xl text-sm font-semibold transition-all ${
                        skillScores[key] === n
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">특히 보완하고 싶은 영역</h2>
              <p className="mt-1 text-sm text-gray-500">복수 선택 · 단어·문장 추천에 반영됩니다</p>
            </div>
            <div className="space-y-2">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleWeakArea(opt.id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
                    weakAreas.includes(opt.id)
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      weakAreas.includes(opt.id)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {weakAreas.includes(opt.id) ? '✓' : ''}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-gray-900">학습 목표</h3>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGoal(opt.id)}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-all ${
                      goal === opt.id
                        ? 'bg-brand-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 inline-flex rounded-2xl bg-brand-100 px-4 py-2 text-2xl font-bold text-brand-700">
                {assessment.levelLabel}
              </div>
              <p className="text-sm text-gray-600">{assessment.levelDescription}</p>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">관심 주제</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {interests.map((id) => {
                    const opt = INTEREST_OPTIONS.find((o) => o.id === id);
                    return (
                      <span key={id} className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm">
                        {opt?.emoji} {opt?.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-gray-400">강점</p>
                <p className="mt-1 text-sm text-gray-700">{assessment.strengths.join(', ')}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-gray-400">보완 포인트</p>
                <p className="mt-1 text-sm text-gray-700">{assessment.focusLabels.join(', ')}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-gray-400">추천 학습법</p>
                <ul className="mt-1 space-y-1">
                  {assessment.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-gray-600">· {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(step - 1)}>
            이전
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          disabled={!canNext()}
          onClick={handleNext}
        >
          {step === STEPS.length - 1 ? '학습 시작하기 🚀' : '다음 →'}
        </Button>
      </div>
    </div>
  );
}
