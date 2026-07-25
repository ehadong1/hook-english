import type { VocabCard } from '../types';

const ts = () => new Date().toISOString();

export const SAMPLE_VOCAB: VocabCard[] = [
  {
    id: 'v1',
    korean: '일정을 조정하고 싶습니다.',
    formalEn: 'Would it be possible to reschedule our meeting?',
    casualEn: 'Can we move the meeting to another time?',
    grammarTip: 'Would it be possible to ~? 는 비즈니스에서 가장 안전한 요청 표현입니다.',
    keyword: 'reschedule',
    status: 'learning',
    nextReviewAt: ts(),
    updatedAt: ts(),
  },
  {
    id: 'v2',
    korean: '확인해 보고 다시 연락드리겠습니다.',
    formalEn: 'Let me look into it and get back to you shortly.',
    casualEn: "I'll check and get back to you.",
    grammarTip: 'Let me ~ 는 즉답이 어려울 때 시간을 버는 표준 표현입니다.',
    keyword: 'get back',
    status: 'learning',
    nextReviewAt: ts(),
    updatedAt: ts(),
  },
  {
    id: 'v3',
    korean: '수율이 저하된 이유를 설명해 주세요.',
    formalEn: 'Could you walk us through the reasons for the yield decline?',
    casualEn: 'Can you explain why the yield dropped?',
    grammarTip: 'walk us through 는 단계적으로 설명해 달라는 뉘앙스입니다.',
    keyword: 'yield',
    status: 'learning',
    nextReviewAt: ts(),
    updatedAt: ts(),
  },
];
