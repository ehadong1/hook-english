export type AppStep = 'survey' | 'start' | 'learn' | 'listening' | 'practice';

export type Interest =
  | 'travel'
  | 'business'
  | 'daily'
  | 'hobby'
  | 'study'
  | 'career';

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export type FocusArea = 'listening' | 'pronunciation' | 'grammar' | 'vocabulary' | 'conversation';

export type LearningGoal =
  | 'travel'
  | 'work'
  | 'exam'
  | 'daily_chat'
  | 'self_improvement';

export interface SkillScores {
  listening: SkillLevel;
  speaking: SkillLevel;
  pronunciation: SkillLevel;
  grammar: SkillLevel;
}

export interface UserProfile {
  interests: Interest[];
  declaredLevel: SkillLevel;
  skillScores: SkillScores;
  weakAreas: FocusArea[];
  goal: LearningGoal;
  completedAt: number;
}

export interface SkillAssessment {
  overallLevel: SkillLevel;
  levelLabel: string;
  levelDescription: string;
  focusAreas: FocusArea[];
  strengths: string[];
  recommendations: string[];
}

export interface WordMeaning {
  word: string;
  meaning: string;
  frequency: string;
  focusArea?: FocusArea;
  isKeyForLevel?: boolean;
}

export interface SentenceAnalysis {
  structure: string;
  words: WordMeaning[];
  usageNote: string;
}

export interface LinkedExample {
  id: string;
  sentence: string;
  phenomenon: string;
}

export interface PronunciationAnalysis {
  summary: string;
  linkingNotes: string[];
  examples: LinkedExample[];
}

export interface SentenceLesson {
  id: string;
  sentence: string;
  korean: string;
  analysis: SentenceAnalysis;
  pronunciation: PronunciationAnalysis;
  practiceQuestion: string;
  practiceQuestionKo: string;
  /** 개인화 추천 이유 */
  matchReason?: string;
}

export interface VocabEntry {
  word: string;
  sentence: string;
  addedAt: number;
}

export interface SavedNote {
  id: string;
  sentence: string;
  savedAt: number;
}

export interface PracticeFeedback {
  pronunciation: string;
  grammar: string;
  overall: string;
}

export interface SentenceBankEntry {
  id: string;
  sentence: string;
  korean: string;
  level: SkillLevel;
  interests: Interest[];
  focusAreas: FocusArea[];
  goals: LearningGoal[];
  templateKey: string;
}
