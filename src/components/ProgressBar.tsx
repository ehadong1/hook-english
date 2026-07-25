import type { AppStep } from '../types';

const STEPS: { key: AppStep; label: string }[] = [
  { key: 'start', label: '입력' },
  { key: 'learn', label: '이해' },
  { key: 'listening', label: '리스닝' },
  { key: 'practice', label: '실전' },
];

interface ProgressBarProps {
  current: AppStep;
}

export function ProgressBar({ current }: ProgressBarProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="mb-6 px-1">
      <div className="flex items-center justify-between gap-1">
        {STEPS.map((step, i) => {
          const isActive = i <= currentIndex;
          const isCurrent = step.key === current;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  isActive ? 'bg-brand-500' : 'bg-gray-200'
                } ${isCurrent ? 'shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? 'text-brand-600' : isActive ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
