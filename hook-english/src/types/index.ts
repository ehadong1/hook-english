export type VocabStatus = 'learning' | 'review_later' | 'mastered';

export interface VocabCard {
  id: string;
  korean: string;
  formalEn: string;
  casualEn: string;
  grammarTip: string;
  keyword?: string;
  status: VocabStatus;
  nextReviewAt: string;
  updatedAt: string;
}

export type TTSProvider = 'openai' | 'azure';

export interface TTSCacheRecord {
  text_hash: string;
  voice: string;
  model: string;
  storage_path: string;
  public_url: string | null;
}

export interface PlaySpeechOptions {
  text: string;
  voice?: string;
  model?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export interface PlaySpeechResult {
  source: 'local' | 'remote' | 'generated';
  uri: string;
}
