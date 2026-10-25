// 앱 전체에서 공유하는 기본 타입. (화면 파일을 하나씩 엄격하게 타입 검사하도록 바꾸는 중입니다.)

/** 온보딩 답변 + 파생값. 키가 많아 느슨하게 둡니다. */
export type Profile = Record<string, any>;

export type HistoryItem = {
  sentenceId: string;
  text: string;
  grammarKeys: string[];
  at: string;
};

export type GrammarEntry = {
  label: string;
  structure: string;
  summary: string;
  detail: string[];
  pitfall: string;
  realUsage: { en: string; ko: string }[];
};

import type { StoreItem } from "./lib/persistence";
export type { StoreItem };

export type Store = { items: StoreItem[] };

/** 학습 문장(SENTENCE_BANK, 직접 입력, 뉴스 문장 공통). 모양이 다양해서 느슨하게 둡니다. */
export type Sentence = Record<string, any>;
