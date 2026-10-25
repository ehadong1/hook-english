
import type { GrammarEntry } from "../types";

/* ============================================================================
   SECTION 2. 문법 개념 라이브러리
   문장은 grammarKeys로 여기를 참조하며, 동일 key가 학습 이력에 있으면
   "지난번 사례"가 작은 글씨로 노출됩니다.
   ============================================================================ */

export const GRAMMAR_LIBRARY: Record<string, GrammarEntry> = {
  politeRequest: {
    label: "정중한 요청 (Could / Would you)",
    structure: "Could you + 동사원형 ~?",
    summary: "Can you보다 한 단계 부드러운 요청. 상대에게 거절할 여지를 남겨주기 때문에 비즈니스 상황에서 기본값처럼 쓰입니다.",
    detail: [
      "Can you ~? 는 '할 수 있어?'라는 능력 확인에 가까워, 처음 만난 사람이나 상급자에게 쓰면 다소 직설적으로 들릴 수 있습니다.",
      "Could you ~? 는 과거형 조동사를 써서 심리적 거리를 만듭니다. 한국어의 '~해주실 수 있을까요?'와 거의 같은 무게입니다.",
      "please를 붙이면 더 정중해지지만, 문장 끝의 please는 상황에 따라 재촉처럼 들릴 수 있어 원어민은 'Could you ~ when you get a chance?' 같은 완충어를 더 자주 씁니다.",
      "가장 정중한 형태는 'Would you mind + -ing?' 입니다. 단, 이 표현의 답은 'No'가 승낙이라는 점을 주의하세요.",
    ],
    pitfall: "자주 하는 실수: Could you to send ~ (X). could 뒤에는 반드시 동사원형 → Could you send ~ (O)",
    realUsage: [
      { en: "Could you walk me through the numbers real quick?", ko: "숫자 부분만 빠르게 설명해 주실 수 있을까요?" },
      { en: "Could you loop me in on that thread?", ko: "그 메일 스레드에 저도 포함시켜 주실 수 있나요?" },
    ],
  },
  nearFuture: {
    label: "가까운 미래 (be going to)",
    structure: "be동사 + going to + 동사원형",
    summary: "이미 마음먹었거나 정황상 확실한 미래. will이 즉흥적 결정이라면 be going to는 '이미 계획된 일'입니다.",
    detail: [
      "will: 말하는 순간 결정한 일. (전화벨이 울림) 'I'll get it.'",
      "be going to: 말하기 전에 이미 정해둔 일. 'I'm going to grab a coffee.'",
      "구어에서는 going to가 'gonna'로 축약됩니다. 이걸 모르면 듣기에서 문장 전체를 놓치므로 반드시 소리로 익혀야 합니다.",
      "단, 이메일이나 공식 문서에서는 gonna를 쓰지 않습니다. 격식 상황에서는 be going to 또는 plan to를 씁니다.",
    ],
    pitfall: "자주 하는 실수: I'm going to office (X) → I'm going to the office (O). 장소 앞에는 관사가 필요합니다.",
    realUsage: [
      { en: "I'm gonna hop off in five — anything else?", ko: "5분 뒤에 빠질게요. 더 있으신가요?" },
      { en: "We're going to push the launch to next quarter.", ko: "출시를 다음 분기로 미룰 예정입니다." },
    ],
  },
  reportedSpeech: {
    label: "간접 인용 (said that ~)",
    structure: "주어 + said (that) + 주어 + 동사",
    summary: "남의 말을 옮길 때 쓰는 구조. 구어에서는 that을 거의 생략하고, 시제 일치가 핵심입니다.",
    detail: [
      "주절이 과거(said)면 종속절도 한 시제 뒤로 밀립니다. 'He says he is busy' → 'He said he was busy.'",
      "지금도 변함없는 사실이면 시제를 그대로 두기도 합니다. 'She said the office opens at 9.'",
      "say는 목적어(사람)를 바로 못 받습니다. say to me (O) / say me (X). tell은 반대로 tell me (O).",
      "실무에서는 said보다 mentioned, noted, flagged 같은 동사가 훨씬 자주 쓰입니다. 뉘앙스가 더 정확하기 때문입니다.",
    ],
    pitfall: "자주 하는 실수: He said me that ~ (X) → He told me that ~ (O)",
    realUsage: [
      { en: "She mentioned the deadline might slip.", ko: "그분이 마감이 밀릴 수도 있다고 하셨어요." },
      { en: "They flagged that the budget is tight this year.", ko: "올해 예산이 빠듯하다고 알려주더라고요." },
    ],
  },
  phrasalVerb: {
    label: "구동사 (Phrasal Verb)",
    structure: "동사 + 전치사/부사 (figure out, get back to ...)",
    summary: "원어민 일상 대화의 절반 이상이 구동사입니다. 어려운 라틴어 단어보다 구동사를 쓰는 것이 훨씬 자연스럽습니다.",
    detail: [
      "구동사는 '분리 가능(separable)'과 '분리 불가(inseparable)'로 나뉩니다.",
      "분리 가능: figure it out (O) / figure out it (X). 대명사 목적어는 반드시 사이에 들어갑니다.",
      "분리 불가: get back to him (O) / get him back to (X).",
      "격식 문서에서는 구동사 대신 단일 동사를 쓰면 톤이 올라갑니다. figure out → determine, get back to → respond to.",
      "듣기 난이도가 높은 이유는 두 단어가 연음되어 하나처럼 들리기 때문입니다. figure out → [피겨라웃]",
    ],
    pitfall: "자주 하는 실수: Please figure out it (X) → Please figure it out (O)",
    realUsage: [
      { en: "Let me look into it and get back to you by Friday.", ko: "제가 확인해보고 금요일까지 회신드릴게요." },
      { en: "We still need to iron out a few details.", ko: "아직 세부사항 몇 개를 정리해야 해요." },
    ],
  },
  modalSuggestion: {
    label: "제안·권고 (should / might want to)",
    structure: "주어 + should + 동사원형",
    summary: "should는 '~하는 게 좋겠다'는 권고. 강제(must)보다 약하지만, 회의에서는 사실상 제안의 기본값입니다.",
    detail: [
      "should는 화자의 판단이 들어간 권고입니다. 규정상 의무는 have to / must를 씁니다.",
      "상대에게 부담을 덜 주려면 'We should ~' 처럼 we를 써서 공동 책임으로 만드는 것이 원어민의 회의 전략입니다.",
      "더 부드럽게: 'We might want to ~', 'It might make sense to ~', 'What if we ~?'",
      "강하게: 'We need to ~' > 'We have to ~' > 'We must ~' (must는 문어체에 가깝고 구어에서는 드뭅니다)",
    ],
    pitfall: "자주 하는 실수: We should to align (X) → We should align (O)",
    realUsage: [
      { en: "We might want to hold off until we hear back from legal.", ko: "법무팀 회신 올 때까지 보류하는 게 좋을 것 같아요." },
      { en: "What if we split this into two phases?", ko: "이걸 두 단계로 나누면 어떨까요?" },
    ],
  },
  conditionalPossibility: {
    label: "가능성 표현 (could / may / might)",
    structure: "주어 + could/might + 동사원형",
    summary: "확신의 정도를 조절하는 장치. 단정 대신 여지를 남기는 것이 영어 비즈니스 화법의 핵심입니다.",
    detail: [
      "확신 강도: will (100%) > should (80%) > may (50%) > might / could (30~40%)",
      "나쁜 소식이나 리스크를 전할 때는 일부러 might/could를 써서 충격을 완화합니다.",
      "could는 과거의 능력을 뜻하기도 해 문맥으로 구분합니다. 'I could swim' vs 'It could rain'.",
      "논문·리포트에서는 may가, 구어에서는 might가 더 자주 쓰입니다.",
    ],
    pitfall: "자주 하는 실수: It will be delayed maybe (X) → It might be delayed (O). maybe를 끝에 붙이지 말고 조동사로 처리하세요.",
    realUsage: [
      { en: "There's a chance this could slip a week.", ko: "이거 일주일 밀릴 가능성이 있어요." },
      { en: "That might not land well with the client.", ko: "그건 클라이언트가 좋게 받아들이지 않을 수도 있어요." },
    ],
  },
  presentProgressive: {
    label: "현재진행 (be + -ing)",
    structure: "be동사 + 동사-ing",
    summary: "지금 벌어지는 일뿐 아니라, '요즘 계속되는 흐름'과 '확정된 가까운 일정'까지 표현합니다.",
    detail: [
      "진행 중: 'I'm reviewing the doc right now.'",
      "요즘의 경향: 'A lot of people are talking about this.' (지금 이 순간이 아니라 요즘 계속)",
      "확정된 미래 일정: 'I'm flying to Seoul on Monday.' (티켓까지 끊은 상태)",
      "상태 동사(know, believe, own, want)는 원칙적으로 진행형을 쓰지 않습니다. I'm knowing (X)",
    ],
    pitfall: "자주 하는 실수: I'm agree with you (X) → I agree with you (O). agree는 이미 동사입니다.",
    realUsage: [
      { en: "I'm seeing a lot of pushback on this internally.", ko: "내부적으로 반발이 꽤 보이고 있어요." },
      { en: "We're heading into a busy quarter.", ko: "바쁜 분기로 접어들고 있어요." },
    ],
  },
  idiomaticExpression: {
    label: "관용 표현 (Idiom)",
    structure: "고정된 어구 전체가 하나의 의미",
    summary: "단어를 하나씩 해석하면 뜻이 안 통하는 표현. 원어민 회의에서 빈번하게 등장하며, 모르면 문맥 전체를 놓칩니다.",
    detail: [
      "step on someone's toes: 남의 영역·역할을 침범하다. 조심스럽게 의견을 낼 때의 전제 표현.",
      "circle back: 나중에 다시 이야기하다. 회의를 끊고 넘어갈 때 쓰는 완곡어.",
      "low-hanging fruit: 쉽게 얻을 수 있는 성과.",
      "on the same page: 인식이 일치한 상태.",
      "관용어는 직역하지 말고 '상황 통째로' 외워야 합니다. 먼저 듣고 이해하는 것부터 목표로 삼으세요.",
    ],
    pitfall: "주의: 관용어는 격식 문서에는 잘 쓰지 않습니다. 이메일에는 직설적인 표현이 오히려 프로페셔널합니다.",
    realUsage: [
      { en: "Let's circle back on this after the numbers come in.", ko: "수치 나온 다음에 이 건 다시 이야기하시죠." },
      { en: "I just want to make sure we're on the same page.", ko: "저희가 같은 이해를 하고 있는지 확인하고 싶어요." },
    ],
  },
  quantifier: {
    label: "수량 표현 (a lot of / plenty of)",
    structure: "a lot of + 가산/불가산 명사",
    summary: "many/much는 구어에서 생각보다 덜 쓰입니다. 긍정문에서는 a lot of가 압도적으로 자연스럽습니다.",
    detail: [
      "긍정문: a lot of / plenty of / tons of (캐주얼)",
      "부정·의문문: many / much 가 자연스럽습니다. 'Do you have much time?'",
      "격식 문서: a great deal of, numerous, a significant number of",
      "a lot of 뒤 동사의 수는 뒤에 오는 명사에 맞춥니다. 'A lot of people are ~' / 'A lot of work is ~'",
    ],
    pitfall: "자주 하는 실수: many peoples (X) → many people (O). people 자체가 이미 복수입니다.",
    realUsage: [
      { en: "We're getting a ton of questions about pricing.", ko: "가격 관련 문의가 엄청 많이 들어오고 있어요." },
      { en: "There's plenty of room to optimize here.", ko: "여기 최적화할 여지가 충분히 있어요." },
    ],
  },
  letMeStructure: {
    label: "완곡한 의지 표명 (Let me ~)",
    structure: "Let me + 동사원형",
    summary: "'제가 ~할게요'를 부드럽게 표현. 직역하면 '허락해달라'지만 실제로는 자기 행동을 예고하는 표현입니다.",
    detail: [
      "'I will check' 보다 'Let me check'가 훨씬 자연스럽고 협조적으로 들립니다.",
      "즉답이 어려울 때 시간을 버는 최고의 표현: 'Let me get back to you on that.'",
      "'Let me know'는 반대로 상대에게 알려달라는 요청입니다. 형태가 비슷하니 구분하세요.",
      "회의를 이끌 때: 'Let me walk you through this.' / 'Let me share my screen.'",
    ],
    pitfall: "자주 하는 실수: Let me to check (X) → Let me check (O). let은 to부정사를 취하지 않습니다.",
    realUsage: [
      { en: "Let me double-check and circle back this afternoon.", ko: "다시 확인해보고 오후에 알려드릴게요." },
      { en: "Let me know if that works for you.", ko: "괜찮으신지 알려주세요." },
    ],
  },
  concessiveContrast: {
    label: "대조·양보 (but / although)",
    structure: "문장 A, but 문장 B",
    summary: "영어 비즈니스 화법의 기본 패턴: 좋은 말 먼저 → but → 진짜 하고 싶은 말. but 뒤가 항상 핵심입니다.",
    detail: [
      "'The presentation went well, but we got pushback on pricing.' → 핵심은 뒤쪽 pushback입니다.",
      "반대할 때 완충 패턴: 'That's a fair point, but I'd push back a little on ~'",
      "though는 구어에서 문장 끝에 붙어 '근데'처럼 쓰입니다. 'It's pricey, though.'",
      "but과 however는 문장부호가 다릅니다. 'A, but B.' / 'A. However, B.'",
    ],
    pitfall: "자주 하는 실수: Although ~, but ~ (X). 한국어 '비록 ~지만'의 영향인데, 영어는 둘 중 하나만 씁니다.",
    realUsage: [
      { en: "I hear you, but I think we're solving the wrong problem.", ko: "말씀은 이해하는데, 제 생각엔 문제 정의가 잘못된 것 같아요." },
      { en: "It works. It's not scalable, though.", ko: "작동은 해요. 근데 확장성이 없죠." },
    ],
  },
};

// 문장 텍스트에서 문법 패턴이 실제로 어디에 쓰였는지 찾는 정규식.
// GRAMMAR_LIBRARY 카드와 SentenceDissection의 "이 문장에서" 해설을 연결합니다.
export const GRAMMAR_DETECT: Record<string, RegExp> = {
  politeRequest: /\b((?:could|can|would)\s+you(?:\s+mind)?)/i,
  nearFuture: /\b((?:going\s+to|gonna)(?:\s+\w+)?)/i,
  reportedSpeech: /\b((?:said|told|mentioned|noted|flagged|warn(?:s|ed)?)\b(?:\s+\w+){0,3})/i,
  phrasalVerb: /\b((?:figure\s+out|get\s+back\s+to|look\s+into|follow\s+up|iron\s+out|roll\s+out|kick(?:s)?\s+off|catch\s+up|check\s+in|reach\s+out|walk(?:\s+\w+)?\s+through|align\s+on))\b/i,
  modalSuggestion: /\b((?:should|might\s+want\s+to|need\s+to)\s+\w+)/i,
  // could/can/would you는 politeRequest로 분류하므로 여기서 제외
  conditionalPossibility: /\b((?:could|might|may)(?!\s+you)\s+\w+)/i,
  // be going to는 nearFuture로 분류하므로 going은 제외
  presentProgressive: /\b((?:am|is|are|'m|'s|'re|was|were)\s+(?!going\b)\w+ing\b)/i,
  idiomaticExpression: /\b((?:step\s+on\s+(?:\w+'s\s+)?toes|circle\s+back|low-hanging\s+fruit|on\s+the\s+same\s+page|raise(?:d)?\s+(?:some\s+)?eyebrows))\b/i,
  quantifier: /\b((?:a\s+lot\s+of|plenty\s+of|tons?\s+of|a\s+number\s+of|a\s+handful\s+of)\s+\w+)/i,
  letMeStructure: /\b(let\s+me(?:\s+\w+)?)/i,
  concessiveContrast: /\b((?:but|although|though|however)\b)/i,
};

export function detectGrammarKeysFromText(text?: string | null): string[] {
  if (!text) return [];
  const keys: string[] = [];
  for (const [key, pattern] of Object.entries(GRAMMAR_DETECT)) {
    if (pattern.test(text)) keys.push(key);
  }
  return keys;
}

export function findGrammarMatch(key: string, text?: string | null): string | null {
  const pattern = GRAMMAR_DETECT[key];
  if (!pattern || !text) return null;
  const m = text.match(pattern);
  return m ? m[1] || m[0] : null;
}

/** 현재 학습 문장에 맞춰 문법 카드용 해설(매칭 구간 + 팁)을 만듭니다. */
export function explainGrammarInSentence(key: string, sentenceText: string) {
  const g = GRAMMAR_LIBRARY[key];
  if (!g) return null;
  const match = findGrammarMatch(key, sentenceText);
  if (match) {
    return {
      match,
      tip: `이 문장에서는 「${match}」가 「${g.structure}」 패턴으로 쓰였어요. ${g.summary}`,
    };
  }
  return {
    match: null,
    tip: `지금 문장 「${sentenceText}」을(를) 기준으로 보면, ${g.summary}`,
  };
}

export function highlightGrammarMatch(text?: string | null, match?: string | null) {
  if (!text) return null;
  if (!match) return text;
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-brand-100 text-brand-900 font-semibold px-0.5 rounded-sm">{text.slice(idx, idx + match.length)}</mark>
      {text.slice(idx + match.length)}
    </>
  );
}
