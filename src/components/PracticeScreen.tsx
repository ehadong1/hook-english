import { useEffect, useState } from 'react';
import type { PracticeFeedback, SavedNote, SentenceLesson, UserProfile } from '../types';
import { generatePracticeFeedback } from '../data/personalization';
import { Button } from './Button';
import { useSpeech, useSpeechRecognition } from '../hooks/useSpeech';
import { useToast } from '../hooks/useToast';

interface PracticeScreenProps {
  lesson: SentenceLesson;
  profile: UserProfile;
  onSaveNote: (note: SavedNote) => void;
  onRestart: () => void;
}

type Phase = 'question' | 'recording' | 'feedback' | 'saved';

export function PracticeScreen({ lesson, profile, onSaveNote, onRestart }: PracticeScreenProps) {
  const { speak } = useSpeech();
  const { isRecording, transcript, startRecording, stopRecording } = useSpeechRecognition();
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('question');
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [hasSpoken, setHasSpoken] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      speak(lesson.practiceQuestion);
      setHasSpoken(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [lesson.practiceQuestion, speak]);

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      setFeedback(null);
      setPhase('recording');
      startRecording((text) => {
        setPhase('feedback');
        setFeedback(generatePracticeFeedback(text, profile));
      });
    }
  };

  const handleSave = () => {
    onSaveNote({
      id: `note-${Date.now()}`,
      sentence: lesson.sentence,
      savedAt: Date.now(),
    });
    setPhase('saved');
    showToast('문장 노트에 저장되었습니다 ✓');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Step 4 · 실전 연습</p>
        <p className="mt-1 text-sm text-gray-500">AI와 롤플레잉해 보세요</p>
      </div>

      <div className="flex-1 space-y-3 rounded-3xl bg-white p-4 shadow-lg shadow-gray-200/60 min-h-[320px]">
        {/* AI message */}
        <div className="flex gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm">
            🤖
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-gray-100 px-4 py-3 text-left">
            <p className="text-sm font-medium text-gray-900">{lesson.practiceQuestion}</p>
            <p className="mt-1 text-xs text-gray-500">{lesson.practiceQuestionKo}</p>
            {hasSpoken && (
              <button
                type="button"
                onClick={() => speak(lesson.practiceQuestion)}
                className="mt-2 text-xs text-brand-600 hover:underline"
              >
                🔊 다시 듣기
              </button>
            )}
          </div>
        </div>

        {/* User recording area */}
        {(phase === 'recording' || transcript) && (
          <div className="flex justify-end gap-2">
            <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand-600 px-4 py-3 text-left text-white">
              {isRecording ? (
                <p className="text-sm animate-pulse">녹음 중...</p>
              ) : transcript ? (
                <p className="text-sm">{transcript}</p>
              ) : (
                <p className="text-sm text-brand-200">마이크를 눌러 답변하세요</p>
              )}
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm text-white">
              🎤
            </div>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && feedback && (
          <div className="flex gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm">
              🤖
            </div>
            <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-md bg-brand-50 px-4 py-3 text-left">
              <p className="text-xs font-bold uppercase text-brand-700">피드백</p>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <strong className="text-gray-900">발음:</strong> {feedback.pronunciation}
                </p>
                <p>
                  <strong className="text-gray-900">문법:</strong> {feedback.grammar}
                </p>
                <p>
                  <strong className="text-gray-900">종합:</strong> {feedback.overall}
                </p>
              </div>
            </div>
          </div>
        )}

        {phase === 'saved' && (
          <div className="rounded-2xl bg-green-50 px-4 py-3 text-center text-sm text-green-800">
            ✅ 복습 노트에 저장 완료! 언제든 다시 연습할 수 있어요.
          </div>
        )}
      </div>

      {/* Mic button */}
      {phase !== 'saved' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={handleMicPress}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-lg transition-all active:scale-95 ${
              isRecording
                ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse'
                : 'bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700'
            }`}
            aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
          >
            🎤
            {isRecording && (
              <span className="absolute inset-0 rounded-full border-2 border-red-300 animate-ping" />
            )}
          </button>
          <p className="text-xs text-gray-500">
            {isRecording ? '탭하여 녹음 완료' : phase === 'feedback' ? '다시 녹음하려면 탭' : '마이크를 눌러 대답하세요'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {phase === 'feedback' && (
          <Button fullWidth size="lg" variant="secondary" onClick={handleSave}>
            📒 이 문장 노트에 저장하기
          </Button>
        )}
        {phase === 'saved' && (
          <Button fullWidth size="lg" onClick={onRestart}>
            🔄 새 문장으로 다시 시작
          </Button>
        )}
      </div>
    </div>
  );
}
