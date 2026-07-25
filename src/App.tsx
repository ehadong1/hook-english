import { useState } from 'react';
import type { AppStep, SavedNote, SentenceLesson, UserProfile, VocabEntry } from './types';
import { buildLessonFromSentence, getPersonalizedDailyLessons } from './data/personalization';
import { useUserProfile } from './hooks/useUserProfile';
import { ToastProvider } from './hooks/useToast';
import { ProgressBar } from './components/ProgressBar';
import { SurveyScreen } from './components/SurveyScreen';
import { StartScreen } from './components/StartScreen';
import { LearnScreen } from './components/LearnScreen';
import { ListeningScreen } from './components/ListeningScreen';
import { PracticeScreen } from './components/PracticeScreen';

function AppContent() {
  const { profile, setProfile, resetProfile, isReady, hasProfile } = useUserProfile();
  const [step, setStep] = useState<AppStep>('start');
  const [lesson, setLesson] = useState<SentenceLesson | null>(null);
  const [dailyLessons, setDailyLessons] = useState<SentenceLesson[]>([]);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [showDailyPicker, setShowDailyPicker] = useState(false);

  const showSurvey = isReady && !hasProfile;

  const handleSurveyComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    setStep('start');
  };

  const startWithSentence = (sentence: string) => {
    if (!profile) return;
    setLesson(buildLessonFromSentence(sentence, profile));
    setStep('learn');
    setShowDailyPicker(false);
  };

  const handleDailyStart = () => {
    if (!profile) return;
    const lessons = getPersonalizedDailyLessons(profile);
    setDailyLessons(lessons);
    setDailyIndex(0);
    setLesson(lessons[0]);
    setShowDailyPicker(true);
    setStep('learn');
  };

  const handleAddVocab = (entry: VocabEntry) => {
    setVocab((prev) => {
      if (prev.some((v) => v.word === entry.word && v.sentence === entry.sentence)) {
        return prev;
      }
      return [...prev, entry];
    });
  };

  const handleSaveNote = (note: SavedNote) => {
    setNotes((prev) => [...prev, note]);
  };

  const handleRestart = () => {
    if (showDailyPicker && dailyIndex < dailyLessons.length - 1) {
      const next = dailyIndex + 1;
      setDailyIndex(next);
      setLesson(dailyLessons[next]);
      setStep('learn');
    } else {
      setStep('start');
      setLesson(null);
      setShowDailyPicker(false);
    }
  };

  const handleRetakeSurvey = () => {
    resetProfile();
    setStep('start');
    setLesson(null);
    setShowDailyPicker(false);
  };

  if (!isReady) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[400px] items-center justify-center">
        <p className="text-sm text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (showSurvey) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[400px] flex-col px-4 py-6">
        <SurveyScreen onComplete={handleSurveyComplete} />
      </div>
    );
  }

  if (!profile) return null;

  const progressStep = step === 'start' ? 'start' : step;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[400px] flex-col px-4 py-6">
      {step !== 'start' && <ProgressBar current={progressStep} />}

      {step === 'start' && (
        <StartScreen
          profile={profile}
          onStart={startWithSentence}
          onDailyStart={handleDailyStart}
          onRetakeSurvey={handleRetakeSurvey}
        />
      )}

      {lesson && step === 'learn' && (
        <>
          {showDailyPicker && (
            <div className="mb-4 space-y-1 rounded-2xl bg-brand-50 px-4 py-2 text-center">
              <p className="text-xs font-medium text-brand-700">
                맞춤 추천 {dailyIndex + 1} / {dailyLessons.length}
              </p>
              {lesson.matchReason && (
                <p className="text-[10px] text-brand-600">{lesson.matchReason}</p>
              )}
            </div>
          )}
          <LearnScreen
            lesson={lesson}
            profile={profile}
            onNext={() => setStep('listening')}
            onAddVocab={handleAddVocab}
          />
        </>
      )}

      {lesson && step === 'listening' && (
        <ListeningScreen lesson={lesson} onNext={() => setStep('practice')} />
      )}

      {lesson && step === 'practice' && (
        <PracticeScreen
          lesson={lesson}
          profile={profile}
          onSaveNote={handleSaveNote}
          onRestart={handleRestart}
        />
      )}

      {(vocab.length > 0 || notes.length > 0) && step === 'start' && (
        <div className="mt-6 space-y-3">
          {vocab.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-md">
              <p className="mb-2 text-xs font-bold uppercase text-gray-400">내 단어장</p>
              <div className="flex flex-wrap gap-2">
                {vocab.slice(-8).map((v) => (
                  <span key={`${v.word}-${v.addedAt}`} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">
                    {v.word}
                  </span>
                ))}
              </div>
            </div>
          )}
          {notes.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-md">
              <p className="mb-2 text-xs font-bold uppercase text-gray-400">저장된 문장 노트</p>
              <ul className="space-y-1 text-left text-sm text-gray-700">
                {notes.map((n) => (
                  <li key={n.id} className="truncate">· {n.sentence}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
