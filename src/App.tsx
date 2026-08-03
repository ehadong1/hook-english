// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BookOpen, Volume2, Mic, Check, X, ChevronDown, MessageCircle,
  RotateCcw, Star, Square, Play, Pause, Repeat, Sparkles, Clock,
  Send, Info, Settings, Languages, Loader2, AudioLines, Newspaper,
  PenLine, Notebook, ChevronUp,
} from "lucide-react";

/* ============================================================================
   SECTION 1. 온보딩 정밀 서베이 설정 (7문항)
   각 답변은 profile 객체에 저장되어 콘텐츠 생성 로직에 실제로 반영됩니다.
   ============================================================================ */

const SURVEY_QUESTIONS = [
  {
    key: "level",
    title: "현재 영어 실력은 어느 정도인가요?",
    sub: "9단계 중 가장 가까운 수준을 선택해 주세요",
    multi: false,
    options: [
      { value: "L1", label: "L1 · 입문", desc: "알파벳·기본 인사만 가능" },
      { value: "L2", label: "L2 · 초급 하", desc: "단어 위주, 짧은 답변만 가능" },
      { value: "L3", label: "L3 · 초급 중", desc: "간단한 문장으로 의사 전달" },
      { value: "L4", label: "L4 · 초급 상", desc: "일상 대화는 가능, 긴 문장은 어려움" },
      { value: "L5", label: "L5 · 중급", desc: "업무·여행에서 기본 소통 가능" },
      { value: "L6", label: "L6 · 중급 상", desc: "회의·이메일로 업무 처리 가능" },
      { value: "L7", label: "L7 · 고급", desc: "전문 주제 토론·발표 가능" },
      { value: "L8", label: "L8 · 고급 상", desc: "협상·설득 등 복잡한 대화 가능" },
      { value: "L9", label: "L9 · 최상", desc: "유창하나 뉘앙스·발음을 다듬고 싶음" },
    ],
  },
  {
    key: "topics",
    title: "본인 업무 영역을 선택해 주세요",
    sub: "복수 선택 가능 · 해당 분야 표현을 우선 추천합니다",
    multi: true,
    options: [
      { value: "IT/소프트웨어", label: "IT / 소프트웨어", desc: "개발, 인프라, QA, DevOps" },
      { value: "제품/PM", label: "제품 / PM", desc: "기획, 로드맵, 스프린트, 백로그" },
      { value: "마케팅/세일즈", label: "마케팅 / 세일즈", desc: "리드, 제안, 고객 미팅" },
      { value: "재무/회계", label: "재무 / 회계", desc: "예산, 결산, IR, 감사" },
      { value: "HR/채용", label: "HR / 채용", desc: "온보딩, 평가, 채용 인터뷰" },
      { value: "법무/컴플라이언스", label: "법무 / 컴플라이언스", desc: "계약, 규정, 리스크" },
      { value: "제조/생산/품질", label: "제조 / 생산 / 품질", desc: "수율, 공정, 불량, 납기" },
      { value: "의료/바이오", label: "의료 / 바이오", desc: "임상, 규제, R&D" },
      { value: "금융/투자", label: "금융 / 투자", desc: "리스크, 포트폴리오, 컴플라이언스" },
      { value: "컨설팅/전략", label: "컨설팅 / 전략", desc: "제안, 분석, 프레젠테이션" },
      { value: "디자인/크리에이티브", label: "디자인 / 크리에이티브", desc: "브리프, 피드백, UX" },
      { value: "경영/임원", label: "경영 / 임원", desc: "전략, KPI, 이해관계자 조율" },
    ],
  },
  {
    key: "purpose",
    title: "학습 목적이 무엇인가요?",
    sub: "가장 가까운 목적을 선택해 주세요",
    multi: false,
    options: [
      { value: "해외 미팅·발표", label: "해외 미팅 · 발표", desc: "화상회의, 프레젠, Q&A 대응" },
      { value: "이메일·문서", label: "이메일 · 문서", desc: "요청, 확인, 팔로업, 보고서" },
      { value: "출장·해외 거주", label: "출장 · 해외 거주", desc: "현지 커뮤니케이션, 협상" },
      { value: "승진·이직·면접", label: "승진 · 이직 · 면접", desc: "자기소개, 경력 설명, 역질문" },
      { value: "시험·자격증", label: "시험 · 자격증", desc: "TOEIC/OPIC, 구조·어휘 정확도" },
      { value: "출퇴근 10분 루틴", label: "출퇴근 10분 루틴", desc: "듣기·반복 중심 가벼운 학습" },
      { value: "발음·연음 교정", label: "발음 · 연음 교정", desc: "소리 훈련과 발음 평가 비중 확대" },
    ],
  },
  {
    key: "dailyTime",
    title: "하루에 얼마나 학습할 수 있나요?",
    sub: "추천 문장 개수와 복습량을 조절합니다",
    multi: false,
    options: [
      { value: "5분 이하", label: "5분 이하", desc: "하루 2문장, 핵심만 압축" },
      { value: "10~15분", label: "10~15분", desc: "하루 3문장, 표준 루틴" },
      { value: "30분 이상", label: "30분 이상", desc: "하루 5문장, 심화 훈련" },
    ],
  },
  {
    key: "weaknesses",
    title: "어려움을 느끼는 부분은? (복수 선택)",
    sub: "선택한 영역의 훈련과 해설을 우선 제공합니다",
    multi: true,
    options: [
      { value: "듣기", label: "리스닝", desc: "빠른 발화·연음을 잘 못 알아듣겠어요" },
      { value: "말하기", label: "말하기 속도", desc: "생각보다 입이 느려요" },
      { value: "발음", label: "발음·억양", desc: "native처럼 안 들려요" },
      { value: "문장 구성", label: "문장 구성", desc: "말하려면 머릿속에서 한→영 번역" },
      { value: "문법", label: "문법", desc: "시제·관사·어순이 자꾸 틀려요" },
      { value: "어휘", label: "어휘력", desc: "적절한 단어가 떠오르지 않아요" },
      { value: "실전 회화", label: "실전 회화", desc: "실제 상황에서 긴장·막힘" },
    ],
  },
  {
    key: "situation",
    title: "주로 어떤 상황에서 영어를 쓰나요?",
    sub: "롤플레이 시나리오와 예문 톤을 맞춥니다",
    multi: false,
    options: [
      { value: "외국인 동료와 일상 대화", label: "외국인 동료와 일상 대화", desc: "스몰토크, 점심, 근황" },
      { value: "화상회의 및 발표", label: "화상회의 및 발표", desc: "보고, 논의, 의견 조율" },
      { value: "이메일 및 문서", label: "이메일 및 문서", desc: "요청, 확인, 팔로업" },
      { value: "해외 출장 및 여행", label: "해외 출장 및 여행", desc: "공항, 호텔, 미팅 세팅" },
    ],
  },
  {
    key: "tone",
    title: "어떤 말투를 익히고 싶으세요?",
    sub: "같은 뜻도 톤에 따라 문장이 달라집니다",
    multi: false,
    options: [
      { value: "정중한 비즈니스", label: "정중한 비즈니스", desc: "Could you / I'd appreciate it if" },
      { value: "중립 실무", label: "중립 실무", desc: "Can you / Let's / I think" },
      { value: "캐주얼 친근", label: "캐주얼 친근", desc: "Wanna / Let me know / Sounds good" },
    ],
  },
];

const LEVEL_TO_LEGACY = {
  L1: "왕초보", L2: "왕초보", L3: "왕초보",
  L4: "기초 회화", L5: "기초 회화",
  L6: "중상급", L7: "중상급", L8: "중상급", L9: "중상급",
};

const TOPIC_TO_BANK = {
  "IT/소프트웨어": "비즈니스/IT 트렌드",
  "제품/PM": "비즈니스/IT 트렌드",
  "마케팅/세일즈": "일상 및 오피스 회화",
  "재무/회계": "비즈니스/IT 트렌드",
  "HR/채용": "일상 및 오피스 회화",
  "법무/컴플라이언스": "비즈니스/IT 트렌드",
  "제조/생산/품질": "비즈니스/IT 트렌드",
  "의료/바이오": "비즈니스/IT 트렌드",
  "금융/투자": "최신 시사 및 뉴스",
  "컨설팅/전략": "비즈니스/IT 트렌드",
  "디자인/크리에이티브": "일상 및 오피스 회화",
  "경영/임원": "비즈니스/IT 트렌드",
};

const TIME_TO_COUNT = { "5분 이하": 2, "10~15분": 3, "30분 이상": 5 };
const WEAKNESS_TO_TAB = { 듣기: "training", 발음: "scoring", "문장 구성": "main", 문법: "main", 말하기: "scoring", 어휘: "main", "실전 회화": "roleplay" };

/* ============================================================================
   SECTION 2. 문법 개념 라이브러리
   문장은 grammarKeys로 여기를 참조하며, 동일 key가 학습 이력에 있으면
   "지난번 사례"가 작은 글씨로 노출됩니다.
   ============================================================================ */

const GRAMMAR_LIBRARY = {
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

/* ============================================================================
   SECTION 3. 문장 데이터 뱅크
   sound: 연음·강세 해부 / nativeAlternatives: 원어민 실사용 대체 표현
   ============================================================================ */

const SENTENCE_BANK = [
  {
    id: "s1", level: "왕초보", topic: "일상 및 오피스 회화", tone: "중립 실무",
    situations: ["외국인 동료와 일상 대화", "이메일 및 문서"],
    text: "Can you send me the file later?",
    translation: "그 파일 나중에 보내줄 수 있어요?",
    grammarKeys: ["politeRequest"],
    vocab: [
      { word: "send", meaning: "보내다", freq: "상위 1% · 일상 필수 동사" },
      { word: "file", meaning: "파일, 문서", freq: "오피스 대화 상위 5%" },
      { word: "later", meaning: "나중에", freq: "구어 상위 3%" },
    ],
    sound: {
      title: "n + y 연결", pattern: "Can you → [캐뉴]",
      note: "'Can you'는 [캔 유]로 끊지 않고 [캐뉴]처럼 이어집니다. 앞 단어의 끝 자음 n이 뒤의 y와 붙으면서 한 덩어리가 돼요. 강세는 send와 file에만 떨어지고 can you는 힘없이 빠르게 지나갑니다.",
      examples: [
        { en: "**Can you** hear me okay?", ko: "제 목소리 잘 들리세요? (화상회의 최빈출)" },
        { en: "**Can you** give me a sec?", ko: "잠깐만요. (자리 비울 때)" },
      ],
    },
    nativeAlternatives: [
      { en: "Mind sending that over when you get a chance?", ko: "시간 될 때 보내주실 수 있을까요?", note: "가장 캐주얼하고 부담 없는 요청" },
      { en: "Could you shoot me that file?", ko: "그 파일 좀 보내주실래요?", note: "shoot = 가볍게 보내다, 동료 사이 최빈출" },
    ],
  },
  {
    id: "s2", level: "왕초보", topic: "일상 및 오피스 회화", tone: "캐주얼 친근",
    situations: ["외국인 동료와 일상 대화"],
    text: "I'm going to grab a coffee.",
    translation: "저 커피 한 잔 사올게요.",
    grammarKeys: ["nearFuture"],
    vocab: [
      { word: "grab", meaning: "간단히 사다 / 집다", freq: "구어 상위 4%" },
      { word: "coffee", meaning: "커피", freq: "일상 상위 1%" },
    ],
    sound: {
      title: "going to 축약", pattern: "going to → gonna [고너]",
      note: "'going to'는 편하게 말할 때 [고너]로 줄어듭니다. t 소리가 사라지고 두 단어가 한 음절처럼 붙어요. 이걸 모르면 듣기에서 문장이 통째로 안 들립니다.",
      examples: [
        { en: "I'm **going to** hop on a call.", ko: "저 통화 하나 들어갈게요." },
        { en: "We're **going to** need more time.", ko: "시간이 더 필요할 것 같아요." },
      ],
    },
    nativeAlternatives: [
      { en: "I'm gonna run and grab a coffee — want anything?", ko: "커피 사러 갈 건데, 뭐 필요하세요?", note: "뒤에 한마디 붙이는 게 원어민 습관" },
      { en: "Making a coffee run. You in?", ko: "커피 사러 가는데 같이 가실래요?", note: "사무실에서 실제로 가장 많이 쓰는 표현" },
    ],
  },
  {
    id: "s3", level: "왕초보", topic: "최신 시사 및 뉴스", tone: "중립 실무", isNews: true,
    situations: ["외국인 동료와 일상 대화"],
    text: "The news said it will rain tomorrow.",
    translation: "뉴스에서 내일 비가 온다고 했어요.",
    grammarKeys: ["reportedSpeech"],
    vocab: [
      { word: "news", meaning: "뉴스, 소식", freq: "상위 1% 필수 어휘" },
      { word: "rain", meaning: "비가 오다", freq: "일상 상위 3%" },
    ],
    sound: {
      title: "자음 + 모음 연결", pattern: "said it → [세딧]",
      note: "'said it'은 d와 i가 만나 [세딧]처럼 이어집니다. 영어는 단어 사이를 띄우지 않고 소리를 굴려 붙이는 언어라서, 한 단어씩 또박또박 발음하면 오히려 알아듣기 어렵습니다.",
      examples: [
        { en: "I **said it** twice already.", ko: "이미 두 번 말했어요." },
        { en: "She **said it** was fine.", ko: "그분은 괜찮다고 하셨어요." },
      ],
    },
    nativeAlternatives: [
      { en: "Weather app says rain tomorrow.", ko: "날씨 앱 보니까 내일 비 온대요.", note: "요즘은 news보다 weather app을 훨씬 많이 씁니다" },
      { en: "Supposed to rain tomorrow.", ko: "내일 비 온다던데요.", note: "주어까지 생략하는 실제 구어체" },
    ],
  },
  {
    id: "s4", level: "왕초보", topic: "비즈니스/IT 트렌드", tone: "중립 실무",
    situations: ["화상회의 및 발표"],
    text: "Our app got a big update.",
    translation: "우리 앱이 큰 업데이트를 했어요.",
    grammarKeys: ["quantifier"],
    vocab: [
      { word: "update", meaning: "업데이트, 갱신", freq: "IT 대화 상위 1%" },
      { word: "app", meaning: "앱, 애플리케이션", freq: "IT 상위 1%" },
    ],
    sound: {
      title: "모음 사이 T 약화", pattern: "got a → [가러]",
      note: "'got a'의 t는 모음 사이에 끼면 한국어 'ㄹ'에 가까운 소리로 약해져 [가러]처럼 들립니다. 미국식 발음의 가장 대표적인 특징이라 이것만 익혀도 듣기가 확 트입니다.",
      examples: [
        { en: "I **got a** quick question.", ko: "간단한 질문 하나 있어요." },
        { en: "She **got a** promotion.", ko: "그분 승진하셨어요." },
      ],
    },
    nativeAlternatives: [
      { en: "We just shipped a major update.", ko: "방금 대규모 업데이트를 배포했어요.", note: "ship = 출시하다, IT 업계 표준 표현" },
      { en: "The app got a pretty big refresh.", ko: "앱이 꽤 크게 개편됐어요.", note: "refresh = 디자인·UX 개편" },
    ],
  },
  {
    id: "s5", level: "기초 회화", topic: "일상 및 오피스 회화", tone: "중립 실무",
    situations: ["화상회의 및 발표", "이메일 및 문서"],
    text: "Let me check my schedule and get back to you.",
    translation: "일정 확인하고 다시 알려드릴게요.",
    grammarKeys: ["letMeStructure", "phrasalVerb"],
    vocab: [
      { word: "schedule", meaning: "일정", freq: "오피스 상위 2%" },
      { word: "get back to", meaning: "~에게 회신하다", freq: "비즈니스 상위 1%" },
    ],
    sound: {
      title: "자음 충돌 시 T 탈락", pattern: "get back → [게백]",
      note: "'get back'처럼 t 뒤에 b가 오면 t를 거의 발음하지 않고 숨만 멈췄다 넘어갑니다. [겟백]이 아니라 [게백]에 가까워요. 자음이 연달아 나오면 앞 자음이 희생되는 것이 영어의 기본 리듬입니다.",
      examples: [
        { en: "Let me **get back** to you on that.", ko: "그건 확인하고 알려드릴게요. (즉답 피하는 만능 표현)" },
        { en: "Let's **get back** to the main point.", ko: "본론으로 돌아가시죠." },
      ],
    },
    nativeAlternatives: [
      { en: "Let me look at my calendar and follow up.", ko: "일정 확인하고 팔로업할게요.", note: "follow up이 비즈니스에서 더 표준적" },
      { en: "I'll check and let you know by EOD.", ko: "확인하고 오늘 안에 알려드릴게요.", note: "EOD = End of Day, 이메일 최빈출 약어" },
    ],
  },
  {
    id: "s6", level: "기초 회화", topic: "일상 및 오피스 회화", tone: "정중한 비즈니스",
    situations: ["화상회의 및 발표"],
    text: "Could you walk me through this process?",
    translation: "이 과정을 좀 설명해 주실 수 있나요?",
    grammarKeys: ["politeRequest", "phrasalVerb"],
    vocab: [
      { word: "walk through", meaning: "차근차근 설명하다", freq: "회의 표현 상위 2%" },
      { word: "process", meaning: "과정, 절차", freq: "비즈니스 상위 3%" },
    ],
    sound: {
      title: "d + y 결합", pattern: "Could you → [쿠쥬]",
      note: "'Could you'는 d와 y가 만나 [쿠쥬]로 발음됩니다. 두 소리가 부딪히며 아예 새로운 'ㅈ' 소리를 만드는 현상이에요. Would you[우쥬], Did you[디쥬]도 같은 규칙입니다.",
      examples: [
        { en: "**Could you** repeat that? You cut out.", ko: "다시 말씀해 주실래요? 소리가 끊겼어요. (화상회의 필수)" },
        { en: "**Could you** send the deck beforehand?", ko: "자료를 미리 보내주실 수 있나요?" },
      ],
    },
    nativeAlternatives: [
      { en: "Do you mind walking me through it?", ko: "설명 좀 해주실 수 있을까요?", note: "부담을 가장 덜 주는 형태" },
      { en: "Can you give me the high-level version?", ko: "큰 그림만 짚어주실 수 있나요?", note: "시간 없을 때 쓰는 실무 표현" },
    ],
  },
  {
    id: "s7", level: "기초 회화", topic: "최신 시사 및 뉴스", tone: "중립 실무", isNews: true,
    situations: ["외국인 동료와 일상 대화"],
    text: "A lot of people are talking about this issue.",
    translation: "많은 사람들이 이 이슈에 대해 이야기하고 있어요.",
    grammarKeys: ["quantifier", "presentProgressive"],
    vocab: [
      { word: "issue", meaning: "이슈, 사안", freq: "뉴스 상위 1%" },
      { word: "talk about", meaning: "~에 대해 이야기하다", freq: "일상 상위 2%" },
    ],
    sound: {
      title: "T 약화 + 연결", pattern: "a lot of → [얼라러브]",
      note: "'lot of'는 t가 모음 사이에서 굴러 [라러브]에 가깝게 들립니다. 여기에 a까지 붙어 'a lot of'가 [얼라러브]처럼 한 덩어리로 흘러갑니다. 강세는 people과 talking에만 있습니다.",
      examples: [
        { en: "There's **a lot of** interest in this.", ko: "이거 관심이 많아요." },
        { en: "We got **a lot of** feedback already.", ko: "벌써 피드백을 많이 받았어요." },
      ],
    },
    nativeAlternatives: [
      { en: "This is getting a lot of attention right now.", ko: "이 건이 지금 주목을 많이 받고 있어요.", note: "뉴스·시사에서 가장 자연스러운 표현" },
      { en: "Everyone's been talking about this.", ko: "다들 이 얘기 하고 있더라고요.", note: "현재완료진행으로 '한동안 계속'을 표현" },
    ],
  },
  {
    id: "s8", level: "기초 회화", topic: "비즈니스/IT 트렌드", tone: "중립 실무",
    situations: ["화상회의 및 발표"],
    text: "We need to figure out a better way to track this.",
    translation: "이걸 관리할 더 좋은 방법을 찾아야 해요.",
    grammarKeys: ["phrasalVerb", "modalSuggestion"],
    vocab: [
      { word: "figure out", meaning: "알아내다, 방법을 찾다", freq: "비즈니스 상위 2%" },
      { word: "track", meaning: "추적·관리하다", freq: "IT 상위 3%" },
    ],
    sound: {
      title: "r 뒤 모음 연결", pattern: "figure out → [피겨라웃]",
      note: "'figure out'은 figure의 r과 out의 모음이 이어지며 [피겨라웃]처럼 한 단어가 됩니다. 강세는 fig-와 -out 두 곳에 계단처럼 얹힙니다.",
      examples: [
        { en: "Let's **figure out** the root cause first.", ko: "근본 원인부터 파악하시죠." },
        { en: "I can't **figure out** why it's failing.", ko: "왜 실패하는지 모르겠어요." },
      ],
    },
    nativeAlternatives: [
      { en: "There's gotta be a better way to keep tabs on this.", ko: "이걸 관리할 더 나은 방법이 분명 있을 거예요.", note: "keep tabs on = 지속적으로 살피다" },
      { en: "We should nail down a cleaner process for this.", ko: "이 건은 더 깔끔한 프로세스를 확정해야 해요.", note: "nail down = 확정 짓다" },
    ],
  },
  {
    id: "s9", level: "중상급", topic: "비즈니스/IT 트렌드", tone: "정중한 비즈니스",
    situations: ["화상회의 및 발표"],
    text: "We should align on the roadmap before the next sprint kicks off.",
    translation: "다음 스프린트가 시작되기 전에 로드맵을 맞춰야 합니다.",
    grammarKeys: ["modalSuggestion", "phrasalVerb"],
    vocab: [
      { word: "align on", meaning: "~에 대해 합의하다", freq: "비즈니스 회의 상위 1%" },
      { word: "roadmap", meaning: "로드맵, 중장기 계획", freq: "IT/기획 상위 2%" },
      { word: "kick off", meaning: "시작하다", freq: "비즈니스 상위 3%" },
    ],
    sound: {
      title: "계단식 억양", pattern: "aLIGN ↘ ROADmap ↘ SPRINT",
      note: "영어 문장의 핵심어들은 평평하게 나열되지 않고, 계단을 내려가듯 음높이가 단계적으로 떨어집니다. 여기서는 aLIGN → ROADmap → SPRINT 순으로 각 강세가 조금씩 낮아지며, 나머지 기능어(we, on, the, before)는 거의 들리지 않을 만큼 눌립니다. 한국어처럼 모든 음절을 균등하게 발음하면 원어민 귀에는 로봇처럼 들립니다.",
      examples: [
        { en: "Let's **align on** scope before we start building.", ko: "개발 착수 전에 범위부터 맞추시죠." },
        { en: "The project **kicks off** Monday.", ko: "프로젝트는 월요일에 시작합니다." },
      ],
    },
    nativeAlternatives: [
      { en: "Let's get on the same page about the roadmap first.", ko: "먼저 로드맵에 대한 인식을 맞추시죠.", note: "get on the same page가 더 부드러움" },
      { en: "Before we kick off, can we lock in the roadmap?", ko: "시작 전에 로드맵을 확정할 수 있을까요?", note: "lock in = 확정하다" },
    ],
  },
  {
    id: "s10", level: "중상급", topic: "비즈니스/IT 트렌드", tone: "중립 실무",
    situations: ["화상회의 및 발표", "이메일 및 문서"],
    text: "The presentation went well, but we got a lot of pushback on pricing.",
    translation: "발표는 잘 됐지만, 가격 정책에 대한 반발이 많았어요.",
    grammarKeys: ["concessiveContrast", "quantifier"],
    vocab: [
      { word: "pushback", meaning: "반발, 이견", freq: "비즈니스 상위 3%" },
      { word: "pricing", meaning: "가격 정책", freq: "비즈니스 상위 2%" },
    ],
    sound: {
      title: "but 앞의 끊김", pattern: "got a lot of → [가럴라러브]",
      note: "but 앞에서 살짝 멈추고 음을 올렸다가, but 뒤부터 다시 힘을 실어 말합니다. 이 멈춤이 '진짜 하고 싶은 말은 지금부터'라는 신호예요. 뒤쪽 'got a lot of'는 t가 연속으로 약해져 빠르게 흘러갑니다.",
      examples: [
        { en: "It works, **but** it's not scalable.", ko: "돌아가긴 하는데 확장이 안 돼요." },
        { en: "I like the idea, **but** the timing's off.", ko: "아이디어는 좋은데 타이밍이 안 맞아요." },
      ],
    },
    nativeAlternatives: [
      { en: "The demo landed well — pricing was the sticking point.", ko: "데모 반응은 좋았고, 가격이 걸림돌이었어요.", note: "sticking point = 합의를 막는 쟁점" },
      { en: "Good reception overall, though pricing raised some eyebrows.", ko: "전반적으로 반응은 좋았는데 가격에서 우려가 나왔어요.", note: "raise eyebrows = 의구심을 사다" },
    ],
  },
  {
    id: "s11", level: "중상급", topic: "최신 시사 및 뉴스", tone: "정중한 비즈니스", isNews: true,
    situations: ["이메일 및 문서"],
    text: "Experts warn that the policy could backfire in the long run.",
    translation: "전문가들은 그 정책이 장기적으로 역효과를 낼 수 있다고 경고합니다.",
    grammarKeys: ["reportedSpeech", "conditionalPossibility"],
    vocab: [
      { word: "backfire", meaning: "역효과를 내다", freq: "시사 어휘 상위 4%" },
      { word: "in the long run", meaning: "장기적으로", freq: "시사·에세이 상위 3%" },
    ],
    sound: {
      title: "복합어 강세 위치", pattern: "could BACKfire → [커드 백파이어]",
      note: "backfire처럼 두 단어가 합쳐진 복합어는 앞부분(BACK-)에 강세가 옵니다. 반면 could는 거의 [커드]로 눌려 사라지듯 지나갑니다. 조동사는 약하게, 내용어는 강하게 — 이 대비가 영어 리듬의 전부입니다.",
      examples: [
        { en: "This **could backfire** if we rush it.", ko: "서두르면 역효과가 날 수 있어요." },
        { en: "Cutting costs there **could backfire**.", ko: "거기서 비용을 줄이면 역효과일 수 있습니다." },
      ],
    },
    nativeAlternatives: [
      { en: "Analysts are warning this may come back to bite us.", ko: "전문가들은 이게 나중에 발목을 잡을 거라고 경고합니다.", note: "come back to bite = 나중에 화가 되어 돌아오다" },
      { en: "There's growing concern the policy could have the opposite effect.", ko: "그 정책이 반대 효과를 낼 거라는 우려가 커지고 있습니다.", note: "뉴스 기사체에 가장 가까운 표현" },
    ],
  },
  {
    id: "s12", level: "중상급", topic: "일상 및 오피스 회화", tone: "정중한 비즈니스",
    situations: ["화상회의 및 발표", "외국인 동료와 일상 대화"],
    text: "I don't want to step on anyone's toes, but I think we should revisit this.",
    translation: "누구의 영역을 침범하고 싶진 않지만, 이 건은 다시 검토해야 할 것 같아요.",
    grammarKeys: ["idiomaticExpression", "concessiveContrast", "modalSuggestion"],
    vocab: [
      { word: "step on someone's toes", meaning: "남의 영역을 침범하다", freq: "오피스 관용구 상위 5%" },
      { word: "revisit", meaning: "재검토하다", freq: "비즈니스 상위 2%" },
    ],
    sound: {
      title: "want to 축약", pattern: "don't want to → [도워너]",
      note: "'want to'는 구어에서 [워너]로 줄어듭니다. don't want to는 통째로 [도워너]처럼 뭉쳐요. 'step on'은 p와 o가 이어져 [스테폰]이 됩니다. 강세는 STEP, TOES, REvisit 세 곳에만 실립니다.",
      examples: [
        { en: "I don't **want to** derail the discussion, but...", ko: "논의를 흐트러뜨리고 싶진 않은데요..." },
        { en: "I don't **want to** speak for everyone, but...", ko: "모두를 대변하고 싶진 않지만..." },
      ],
    },
    nativeAlternatives: [
      { en: "Not trying to overstep here, but I'd like to revisit this.", ko: "선 넘으려는 건 아닌데, 이 건 다시 보고 싶어요.", note: "overstep이 더 간결하고 자주 쓰임" },
      { en: "With all due respect, I think this deserves another look.", ko: "실례를 무릅쓰고 말씀드리면, 이건 재검토가 필요해 보입니다.", note: "격식 높은 반대 표명" },
    ],
  },
];

/* ============================================================================
   SECTION 4. 음성 엔진 (TTS 품질 개선 + STT)

   브라우저 기본 voice는 대부분 기기 내장 저품질 엔진입니다. 품질 순서:
     1) 클라우드 뉴럴 TTS (ElevenLabs / Azure Neural)  ← setNeuralTTSProvider로 연결
     2) OS 온라인 뉴럴 (Microsoft "Natural", Google US English)
     3) OS 프리미엄 로컬 (macOS Ava/Samantha Premium)
     4) 기본 로컬 보이스 (가장 기계적)
   아래 로직이 2~3순위를 자동 선택합니다.
   ============================================================================ */

const VOICE_PREFERENCE = [
  "Microsoft Ava Online (Natural) - English (United States)",
  "Microsoft Andrew Online (Natural) - English (United States)",
  "Microsoft Emma Online (Natural) - English (United States)",
  "Microsoft Brian Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Google US English",
  "Ava (Premium)", "Samantha (Enhanced)", "Allison (Enhanced)",
  "Ava", "Samantha", "Alex",
];

let cachedVoices = [];
let neuralProvider = null;
let currentAudio = null;

/** 고품질 클라우드 TTS 연결 훅 (연결되면 자동 우선 사용) */
export function setNeuralTTSProvider(fn) { neuralProvider = fn; }
function hasNeuralProvider() { return typeof neuralProvider === "function"; }

function loadVoices() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const pick = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return false;
      const scored = all
        .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"))
        .map((v) => {
          let score = 0;
          const idx = VOICE_PREFERENCE.indexOf(v.name);
          if (idx >= 0) score += 1000 - idx * 10;
          if (/natural|neural|premium|enhanced/i.test(v.name)) score += 300;
          if (v.localService === false) score += 200;
          if (v.lang === "en-US") score += 100;
          if (/compact|eloquence|novelty|whisper|bells|bad news/i.test(v.name)) score -= 500;
          return { v, score };
        })
        .sort((a, b) => b.score - a.score);
      cachedVoices = scored.map((s) => s.v);
      resolve(cachedVoices);
      return true;
    };
    if (pick()) return;
    window.speechSynthesis.onvoiceschanged = () => pick();
    setTimeout(() => resolve(cachedVoices), 1200);
  });
}

async function speak(text, opts = {}) {
  const { voice, rate = 0.92, loopRef, onEnd, onStart } = opts;
  stopSpeaking();

  if (neuralProvider) {
    try {
      const url = await neuralProvider(text);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onplay = () => onStart && onStart();
      audio.onended = () => {
        currentAudio = null;
        if (loopRef && loopRef.current) speak(text, opts);
        else onEnd && onEnd();
      };
      await audio.play();
      return;
    } catch { /* 브라우저 TTS로 폴백 */ }
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd && onEnd(); return; }
  if (!cachedVoices.length) await loadVoices();

  const u = new SpeechSynthesisUtterance(text);
  const chosen = voice || cachedVoices[0];
  if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else { u.lang = "en-US"; }
  u.rate = rate;   // 0.92 — 또박또박하되 부자연스럽지 않은 속도
  u.pitch = 1.0;   // 기본값 유지 (변형하면 기계음이 심해짐)
  u.volume = 1.0;
  u.onstart = () => onStart && onStart();
  u.onend = () => { if (loopRef && loopRef.current) speak(text, opts); else onEnd && onEnd(); };
  window.speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function isSTTSupported() {
  return typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function createRecognizer(lang = "ko-KR") {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = lang; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
  return r;
}

/* ============================================================================
   SECTION 5. 한글 → 영어 뉘앙스 변환

   직역이 아니라 (1) 의도 (2) 상대와의 거리(격식) (3) 맥락을 반영합니다.
   LLM 프로바이더가 연결되면 그쪽을 우선 사용하고, 없으면 내장 패턴 엔진으로
   동작하며 매칭 실패 시 "정확도 낮음"을 솔직하게 표시합니다.
   ============================================================================ */

let llmProvider = null;
export function setTranslationProvider(fn) { llmProvider = fn; }

function containsKorean(t) { return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(t); }

function detectPoliteness(ko) {
  if (/(습니다|합니다|십니다|드립니다|을까요|ㅂ니까|시겠)/.test(ko)) return "formal";
  if (/(해요|어요|아요|세요|네요|죠)/.test(ko)) return "neutral";
  return "casual";
}

function detectIntent(ko) {
  if (/(해줄|해주|보내줘|해주세요|가능할까요|부탁|요청|할 수 있)/.test(ko)) return "request";
  if (/(못|안 될|어려울|힘들|곤란|죄송|미안)/.test(ko)) return "decline";
  if (/(어떻게|왜|언제|어디|누가|무엇|뭐|인가요|일까요|\?)/.test(ko)) return "question";
  if (/(감사|고맙|덕분)/.test(ko)) return "thanks";
  if (/(할게|하겠|드릴게|보낼게|확인해볼|알아볼)/.test(ko)) return "commit";
  if (/(같아요|것 같|생각해|제 의견|제안)/.test(ko)) return "opinion";
  return "statement";
}

const PHRASE_MAP = [
  {
    re: /(회의|미팅).*(일정|시간).*(변경|조정|미루|리스케)/,
    formal: "Would it be possible to reschedule our meeting?",
    neutral: "Can we move the meeting to another time?",
    casual: "Any chance we can push the meeting?",
    nuance: "한국어 '일정을 조정하고 싶다'는 완곡하지만, 영어에서는 reschedule 한 단어로 깔끔하게 끝냅니다. 이유를 길게 붙이지 않는 것이 오히려 프로페셔널합니다.",
    alts: [
      { en: "Would it work to push our meeting to Thursday?", ko: "미팅을 목요일로 옮겨도 괜찮을까요?", note: "대안 시점을 함께 제시하면 훨씬 매너 있게 들립니다" },
      { en: "Sorry — something came up. Can we find another time?", ko: "죄송해요, 일이 생겨서요. 다른 시간 잡을 수 있을까요?", note: "something came up = 만능 사유 표현" },
    ],
  },
  {
    re: /(확인|검토).*(하고|한 후|해보고).*(알려|회신|연락|답변)/,
    formal: "Let me look into it and get back to you shortly.",
    neutral: "Let me check and get back to you.",
    casual: "Lemme check and I'll let you know.",
    nuance: "'I will check'보다 'Let me check'가 훨씬 협조적으로 들립니다. 즉답이 어려울 때 시간을 버는 가장 자연스러운 표현입니다.",
    alts: [
      { en: "I'll dig into this and follow up by EOD.", ko: "자세히 확인해보고 오늘 안에 팔로업할게요.", note: "EOD = End of Day" },
      { en: "Give me a bit to look into it.", ko: "확인할 시간 좀 주세요.", note: "동료 사이의 캐주얼한 버전" },
    ],
  },
  {
    re: /(자료|파일|문서|보고서).*(보내|공유|전달)/,
    formal: "Could you share the file with me when you get a chance?",
    neutral: "Could you send me the file?",
    casual: "Mind sending that file over?",
    nuance: "'when you get a chance'를 붙이면 급하지 않다는 신호가 되어 상대의 부담이 크게 줄어듭니다. 영어권 직장 문화에서 매우 중요한 완충 장치입니다.",
    alts: [
      { en: "Could you shoot me that deck?", ko: "그 자료 좀 보내주실래요?", note: "shoot = 가볍게 보내다, 동료 사이 최빈출" },
      { en: "Would you mind forwarding that thread?", ko: "그 메일 스레드 전달해 주실 수 있을까요?", note: "가장 정중한 형태" },
    ],
  },
  {
    re: /(죄송|미안).*(늦|지연|못)/,
    formal: "I apologize for the delay on this.",
    neutral: "Sorry for the delay on this.",
    casual: "Sorry this took a while.",
    nuance: "한국어는 사과를 길게 하지만 영어 비즈니스에서는 짧게 사과하고 바로 해결책이나 새 일정으로 넘어가는 것이 신뢰를 줍니다.",
    alts: [
      { en: "Apologies for the slow reply — catching up now.", ko: "답장이 늦어 죄송합니다. 지금 확인 중이에요.", note: "이메일 회신 지연 시 표준 표현" },
      { en: "Sorry to keep you waiting on this.", ko: "기다리게 해서 죄송해요.", note: "상대 입장을 배려한 형태" },
    ],
  },
  {
    re: /(어렵|힘들|곤란|못 할|안 될|불가능)/,
    formal: "I'm afraid that might be difficult on our end.",
    neutral: "That's going to be tough for us.",
    casual: "That's a bit of a stretch for us.",
    nuance: "영어권에서는 'No'를 직접 말하지 않고 difficult / tough / a stretch로 완충합니다. 'I'm afraid'는 나쁜 소식 앞에 붙이는 표준 신호어입니다.",
    alts: [
      { en: "I don't think we can make that work by Friday.", ko: "금요일까지는 어려울 것 같아요.", note: "불가능한 이유를 구체적으로 한정" },
      { en: "That's doable, but we'd need to drop something else.", ko: "가능은 한데, 다른 걸 하나 빼야 해요.", note: "거절 대신 조건을 제시하는 고급 화법" },
    ],
  },
  {
    re: /(감사|고맙)/,
    formal: "Thank you so much for your help on this.",
    neutral: "Thanks a lot for the help.",
    casual: "Thanks — you're a lifesaver.",
    nuance: "무엇에 대한 감사인지 한 조각만 붙이면 훨씬 진심으로 들립니다. 'Thanks for turning this around so quickly.'처럼요.",
    alts: [
      { en: "Really appreciate you jumping on this.", ko: "빨리 봐주셔서 정말 감사해요.", note: "appreciate가 thanks보다 무게감 있음" },
      { en: "Thanks for turning this around so fast.", ko: "이렇게 빨리 처리해 주셔서 감사합니다.", note: "turn around = 신속히 처리하다" },
    ],
  },
  {
    re: /(다시|재).*(검토|논의|이야기|얘기)/,
    formal: "I think this deserves another look.",
    neutral: "I think we should revisit this.",
    casual: "Can we circle back on this?",
    nuance: "circle back은 회의를 일단 끊고 나중에 다시 다루자는 뜻으로 미국 직장에서 극도로 자주 쓰입니다. 단, 이메일 문서에서는 revisit이 더 안전합니다.",
    alts: [
      { en: "Let's park this and come back to it next week.", ko: "이건 일단 보류하고 다음 주에 다시 보시죠.", note: "park = 잠시 보류하다" },
      { en: "Can we take another pass at this?", ko: "이거 한 번 더 손볼 수 있을까요?", note: "take a pass at = 한 번 검토하다" },
    ],
  },
  {
    re: /(생각|의견|제안).*(있|드리|말씀)/,
    formal: "I'd like to share a thought on this, if I may.",
    neutral: "I have a thought on this.",
    casual: "Quick thought here.",
    nuance: "영어 회의에서는 의견을 던지기 전에 짧은 신호어를 붙입니다. 이게 없으면 갑자기 끼어든 느낌이 되어 무례하게 들릴 수 있습니다.",
    alts: [
      { en: "Building on that — what if we tried a phased rollout?", ko: "그 말씀에 덧붙이자면, 단계적 출시는 어떨까요?", note: "Building on that = 상대 의견을 존중하며 확장" },
      { en: "Playing devil's advocate for a second...", ko: "일부러 반대편에서 짚어보자면...", note: "반대 의견을 안전하게 꺼내는 장치" },
    ],
  },
  {
    re: /(진행|상황|현황).*(어떻게|어디까지|공유|알려)/,
    formal: "Could you give me a quick status update on this?",
    neutral: "Where are we on this?",
    casual: "How's this coming along?",
    nuance: "'Where are we on this?'는 사람이 아니라 일을 주어로 삼아 추궁하는 느낌을 없앱니다. 상사가 진행 상황을 물을 때 가장 무난한 표현입니다.",
    alts: [
      { en: "Any movement on this?", ko: "이 건 진전 있나요?", note: "가장 가볍게 묻는 방법" },
      { en: "Just checking in on where this landed.", ko: "이게 어떻게 마무리됐는지 확인차 여쭤봐요.", note: "checking in = 부담 없는 확인" },
    ],
  },
  {
    re: /(잘|괜찮게|성공적).*(됐|되었|진행)/,
    formal: "It went well overall.",
    neutral: "It went pretty well.",
    casual: "It went great.",
    nuance: "영어에서는 성과를 말할 때 구체적 근거를 한 줄 붙이는 것이 기본입니다. 'It went well — we got three follow-up requests.'",
    alts: [
      { en: "It landed well with the team.", ko: "팀 반응이 좋았어요.", note: "land well = 잘 받아들여지다" },
      { en: "Solid response overall.", ko: "전반적으로 반응이 괜찮았어요.", note: "명사형으로 간결하게" },
    ],
  },
];

const INTENT_FALLBACK = {
  request: { formal: "Could you help me with this when you get a chance?", neutral: "Could you help me with this?", casual: "Mind giving me a hand with this?", nuance: "정확한 사전 항목을 찾지 못해 요청 의도만 살린 기본 문장입니다. 목적어를 채워 넣으면 바로 쓸 수 있어요." },
  decline: { formal: "I'm afraid that won't be possible on our end.", neutral: "That's going to be tough.", casual: "Yeah, that's not gonna work.", nuance: "거절 의도를 감지했습니다. 영어는 'I'm afraid'로 완충한 뒤 대안을 제시하는 것이 표준입니다." },
  question: { formal: "Could you clarify what you mean by that?", neutral: "Can you explain that a bit more?", casual: "What do you mean exactly?", nuance: "질문 의도를 감지했습니다. 되묻는 표현은 clarify를 쓰면 무례하지 않게 들립니다." },
  thanks: { formal: "Thank you, I really appreciate it.", neutral: "Thanks, I appreciate it.", casual: "Thanks a bunch!", nuance: "감사 의도를 감지했습니다." },
  commit: { formal: "I'll take care of it and follow up shortly.", neutral: "I'll handle it and let you know.", casual: "On it — I'll ping you.", nuance: "본인이 처리하겠다는 의사를 감지했습니다. 'On it'은 짧고 믿음직하게 들리는 실무 표현입니다." },
  opinion: { formal: "In my view, this is worth reconsidering.", neutral: "I think we should take another look at this.", casual: "I feel like this needs another look.", nuance: "의견 표명 의도를 감지했습니다." },
  statement: { formal: "Here's where things stand.", neutral: "This is where we are.", casual: "So here's the deal.", nuance: "정확한 사전 매칭에 실패했습니다. 아래는 참고용 기본 문장이며 실제 의도와 다를 수 있으니 직접 수정해 사용하세요." },
};

async function translateKoreanToEnglish(koText, profile = {}) {
  const text = (koText || "").trim();
  if (!text) return null;

  if (llmProvider) {
    try { const r = await llmProvider(text, profile); return { ...r, confidence: "high", source: "llm" }; }
    catch { /* 폴백 */ }
  }

  const toneMap = { "정중한 비즈니스": "formal", "중립 실무": "neutral", "캐주얼 친근": "casual" };
  const level = toneMap[profile.tone] || detectPoliteness(text);

  const hit = PHRASE_MAP.find((p) => p.re.test(text));
  if (hit) return { english: hit[level] || hit.neutral, nuance: hit.nuance, alternatives: hit.alts, confidence: "high", source: "pattern" };

  const intent = detectIntent(text);
  const fb = INTENT_FALLBACK[intent];
  return {
    english: fb[level] || fb.neutral,
    nuance: fb.nuance,
    alternatives: [],
    confidence: intent === "statement" ? "low" : "medium",
    source: "fallback",
  };
}

/* ============================================================================
   SECTION 6. 개인화 엔진
   ============================================================================ */

function normalizeProfile(answers) {
  const topics = answers.topics || [];
  return {
    ...answers,
    levelCode: answers.level,
    level: LEVEL_TO_LEGACY[answers.level] || "기초 회화",
    topics,
    topic: topics[0] ? (TOPIC_TO_BANK[topics[0]] || "일상 및 오피스 회화") : "일상 및 오피스 회화",
    weaknesses: answers.weaknesses || [],
    weakness: (answers.weaknesses && answers.weaknesses[0]) || "문장 구성",
  };
}

function getRecommendedSentences(profile, { newsOnly = false, countOverride } = {}) {
  if (!profile) return [];
  const count = countOverride ?? (TIME_TO_COUNT[profile.dailyTime] || 3);
  const legacyLevel = profile.level || LEVEL_TO_LEGACY[profile.levelCode] || "기초 회화";
  const bankTopics = (profile.topics || []).map((t) => TOPIC_TO_BANK[t]).filter(Boolean);
  const weaknesses = profile.weaknesses || [profile.weakness].filter(Boolean);

  return SENTENCE_BANK.filter((s) => (newsOnly ? s.isNews : !s.isNews))
    .map((s) => {
      let score = 0;
      if (s.level === legacyLevel) score += 100;
      else if (legacyLevel === "중상급" && s.level === "기초 회화") score += 30;
      else if (legacyLevel === "기초 회화" && s.level === "왕초보") score += 30;
      else score -= 40;

      if (bankTopics.includes(s.topic)) score += 40;
      if (s.topic === profile.topic) score += 20;
      if (s.situations?.includes(profile.situation)) score += 30;
      if (s.tone === profile.tone) score += 20;
      if (profile.purpose === "발음·연음 교정" && s.sound?.note?.length > 90) score += 15;
      if (weaknesses.includes("문법") && s.grammarKeys.length > 1) score += 15;
      if (weaknesses.includes("듣기") && s.sound) score += 12;
      if (weaknesses.includes("어휘") && s.vocab?.length >= 2) score += 10;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((x) => x.s);
}

function getNewsSentences(profile) {
  return getRecommendedSentences(profile, { newsOnly: true, countOverride: 3 });
}

function describeProfile(p) {
  if (!p) return "";
  const topics = (p.topics || []).slice(0, 2).join(" · ") || p.topic;
  const weak = (p.weaknesses || [p.weakness]).filter(Boolean).slice(0, 2).join(", ");
  return `${p.levelCode || p.level} · ${topics} · ${p.tone} · ${weak}`;
}

function findPastGrammarCases(key, history, currentId) {
  return history.filter((h) => h.grammarKeys.includes(key) && h.sentenceId !== currentId).slice(-3).reverse();
}

function getRoleplayScene(profile) {
  const map = {
    "외국인 동료와 일상 대화": "점심시간, 외국인 동료가 옆자리에 앉으며 가볍게 말을 겁니다. 지난주 프로젝트 이야기로 자연스럽게 넘어갑니다.",
    "화상회의 및 발표": "주간 화상회의가 시작됐습니다. 팀 리더가 당신에게 담당 업무의 진행 상황을 묻습니다.",
    "이메일 및 문서": "해외 파트너가 일정 변경을 요청하는 메시지를 보냈습니다. 정중하게 조율해야 합니다.",
    "해외 출장 및 여행": "출장 첫날, 현지 사무실에서 처음 만난 담당자와 미팅 일정을 조율하고 있습니다.",
  };
  return map[profile?.situation] || map["화상회의 및 발표"];
}

/* ============================================================================
   SECTION 7. 공통 유틸 & UI
   ============================================================================ */

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const uid = (p = "id") => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function renderHighlighted(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <span key={i} className="font-bold text-indigo-600 underline decoration-indigo-300 decoration-2 underline-offset-2">{p.slice(2, -2)}</span>
      : <span key={i}>{p}</span>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg z-[60] max-w-[340px] text-center">
      {message}
    </div>
  );
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-[400px] bg-white rounded-t-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="font-bold text-gray-900 text-[15px] pr-4">{title}</h3>
          <button onClick={onClose} className="text-gray-400 shrink-0"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function SpeakButton({ text, size = 18, className = "" }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setPlaying(true); speak(text, { onEnd: () => setPlaying(false) }); }}
      className={`shrink-0 ${playing ? "text-indigo-400" : "text-indigo-600"} ${className}`}
    >
      {playing ? <AudioLines size={size} className="animate-pulse" /> : <Volume2 size={size} />}
    </button>
  );
}

function Badge({ n }) {
  return <span className="absolute -top-0.5 -right-0.5 bg-indigo-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">{n}</span>;
}

/* ============================================================================
   SECTION 8. 온보딩
   ============================================================================ */

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const q = SURVEY_QUESTIONS[step];
  const value = answers[q.key];

  const isSelected = (optValue) => {
    if (q.multi) return Array.isArray(value) && value.includes(optValue);
    return value === optValue;
  };

  const toggleOption = (optValue) => {
    if (q.multi) {
      setAnswers((a) => {
        const prev = Array.isArray(a[q.key]) ? a[q.key] : [];
        const next = prev.includes(optValue) ? prev.filter((v) => v !== optValue) : [...prev, optValue];
        return { ...a, [q.key]: next };
      });
    } else {
      setAnswers((a) => ({ ...a, [q.key]: optValue }));
    }
  };

  const canNext = q.multi ? Array.isArray(value) && value.length > 0 : !!value;

  return (
    <div className="min-h-screen flex flex-col justify-between p-6">
      <div>
        <div className="flex gap-1 mb-6">
          {SURVEY_QUESTIONS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-600" : "bg-gray-200"}`} />
          ))}
        </div>
        <p className="text-[11px] font-bold text-indigo-500 mb-1">STEP {step + 1} / {SURVEY_QUESTIONS.length}</p>
        <h2 className="text-xl font-bold text-gray-900 mb-1 leading-snug">{q.title}</h2>
        <p className="text-sm text-gray-500 mb-6">{q.sub}</p>
        <div className={`flex flex-col gap-2.5 ${q.multi && q.options.length > 6 ? "max-h-[52vh] overflow-y-auto pr-1" : ""}`}>
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => toggleOption(opt.value)}
              className={`text-left px-4 py-3 rounded-2xl border-2 transition ${isSelected(opt.value) ? "border-indigo-600 bg-indigo-50" : "border-gray-100 bg-gray-50"}`}
            >
              <p className={`text-sm font-semibold ${isSelected(opt.value) ? "text-indigo-700" : "text-gray-800"}`}>{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2.5 mt-8">
        {step > 0 && <button onClick={() => setStep((s) => s - 1)} className="px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold">이전</button>}
        <button
          disabled={!canNext}
          onClick={() => (step < SURVEY_QUESTIONS.length - 1 ? setStep((s) => s + 1) : onComplete(normalizeProfile(answers)))}
          className={`flex-1 py-3.5 rounded-2xl text-sm font-semibold ${canNext ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"}`}
        >
          {step < SURVEY_QUESTIONS.length - 1 ? "다음" : "내 학습 환경 만들기"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   SECTION 9. 문법 상세 시트 + 문장 해부
   ============================================================================ */

function GrammarDetailSheet({ grammarKey, pastCases, onClose }) {
  const g = GRAMMAR_LIBRARY[grammarKey];
  if (!g) return null;
  return (
    <BottomSheet title={g.label} onClose={onClose}>
      <div className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg mb-3">{g.structure}</div>
      <p className="text-sm text-gray-800 leading-relaxed mb-5">{g.summary}</p>

      <p className="text-xs font-bold text-gray-400 mb-2">자세히 알아보기</p>
      <ul className="space-y-2.5 mb-5">
        {g.detail.map((d, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="text-indigo-400 font-bold shrink-0">{i + 1}</span><span>{d}</span>
          </li>
        ))}
      </ul>

      <div className="bg-rose-50 border border-rose-100 rounded-xl p-3.5 mb-5">
        <p className="text-xs font-bold text-rose-500 mb-1">자주 하는 실수</p>
        <p className="text-sm text-gray-700 leading-relaxed">{g.pitfall}</p>
      </div>

      <p className="text-xs font-bold text-gray-400 mb-2">실제 대화에서 이렇게 씁니다</p>
      <div className="space-y-2 mb-5">
        {g.realUsage.map((u, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 flex justify-between items-start gap-2">
            <div><p className="text-sm font-medium text-gray-900">{u.en}</p><p className="text-xs text-gray-500 mt-0.5">{u.ko}</p></div>
            <SpeakButton text={u.en} size={16} />
          </div>
        ))}
      </div>

      {pastCases.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-400 mb-2">내가 이 문법을 배웠던 문장</p>
          <div className="space-y-1.5">
            {pastCases.map((c, i) => (
              <div key={i} className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-700">{c.text}</p>
                <span className="text-[10px] text-amber-600 shrink-0 ml-2">{new Date(c.at).toLocaleDateString("ko-KR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function SentenceDissection({ sentence, history, onSaveWord, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [detailKey, setDetailKey] = useState(null);
  useEffect(() => { setOpen(!!defaultOpen); }, [sentence.id, defaultOpen]);

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">
        <span className="flex items-center gap-1.5"><BookOpen size={16} /> 구조 및 해설 보기</span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3.5">
            <p className="text-xs font-bold text-gray-400 mb-2">① 문법 구조</p>
            <div className="space-y-2.5">
              {sentence.grammarKeys.map((key) => {
                const g = GRAMMAR_LIBRARY[key];
                if (!g) return null;
                const past = findPastGrammarCases(key, history, sentence.id);
                return (
                  <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
                    <button onClick={() => setDetailKey(key)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{g.label}</p>
                          <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{g.structure}</p>
                        </div>
                        <span className="flex items-center gap-0.5 text-[10px] text-indigo-500 font-semibold shrink-0 bg-indigo-50 px-2 py-1 rounded-full">
                          <Info size={11} /> 자세히
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed mt-2">{g.summary}</p>
                    </button>
                    {past.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200">
                        <p className="text-[10px] font-bold text-amber-600 mb-1">지난번에도 이 문법을 봤어요</p>
                        {past.map((c, i) => (
                          <p key={i} className="text-[11px] text-gray-500 leading-relaxed">
                            · {c.text} <span className="text-gray-300">({new Date(c.at).toLocaleDateString("ko-KR")})</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5">
            <p className="text-xs font-bold text-gray-400 mb-2">② 핵심 어휘 · 사용 빈도</p>
            <div className="space-y-2">
              {sentence.vocab.map((v) => (
                <button key={v.word} onClick={() => onSaveWord(v, sentence)} className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100 active:bg-indigo-50">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{v.word}</p>
                    <p className="text-xs text-gray-500">{v.meaning}</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-medium shrink-0 ml-2">{v.freq}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">③ 단어를 누르면 내 단어장에 저장돼요</p>
          </div>

          {sentence.nativeAlternatives?.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
              <p className="text-xs font-bold text-emerald-700 mb-2">④ 원어민들은 이렇게도 표현해요</p>
              <div className="space-y-2">
                {sentence.nativeAlternatives.map((a, i) => (
                  <div key={i} className="bg-white rounded-lg p-3">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{a.en}</p>
                      <SpeakButton text={a.en} size={16} className="text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{a.ko}</p>
                    <p className="text-[11px] text-emerald-600 mt-1.5">TIP · {a.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {detailKey && (
        <GrammarDetailSheet grammarKey={detailKey} pastCases={findPastGrammarCases(detailKey, history, sentence.id)} onClose={() => setDetailKey(null)} />
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 10. 리스닝 & 소리 훈련
   ============================================================================ */

function SoundBreakdown({ sentence }) {
  const s = sentence.sound;
  if (!s) return null;
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold text-amber-700">소리 규칙 해부 · 연음과 강세</p>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{s.title}</span>
      </div>
      <div className="bg-white rounded-lg px-3 py-2 mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-amber-700">{s.pattern}</p>
        <SpeakButton text={sentence.text} size={16} className="text-amber-600" />
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{s.note}</p>

      <p className="text-[11px] font-bold text-amber-600 mt-3 mb-1.5">같은 규칙이 적용된 실제 대화 문장</p>
      <div className="space-y-1.5">
        {s.examples.map((ex, i) => (
          <div key={i} className="bg-white rounded-lg px-3 py-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-gray-800">{renderHighlighted(ex.en)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{ex.ko}</p>
            </div>
            <SpeakButton text={ex.en.replace(/\*\*/g, "")} size={16} className="text-amber-600" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfiniteListening({ text, voice }) {
  const [looping, setLooping] = useState(false);
  const loopRef = useRef(false);

  useEffect(() => {
    loopRef.current = looping;
    if (looping) speak(text, { voice, loopRef });
    else stopSpeaking();
    return () => { loopRef.current = false; stopSpeaking(); };
  }, [looping, text]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 mt-3">
      <p className="text-xs font-bold text-gray-400 mb-2">무한 반복 듣기</p>
      <button onClick={() => setLooping((l) => !l)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold relative overflow-hidden">
        {looping && <span className="absolute inset-0 bg-white/20 animate-pulse" />}
        <Repeat size={17} className={looping ? "animate-spin" : ""} />
        {looping ? "반복 재생 중 · 탭하여 정지" : "원어민 음성 무한 반복"}
      </button>
    </div>
  );
}

function FadingTrainer({ sentence }) {
  const words = useMemo(() => sentence.text.split(" "), [sentence]);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const percents = [0, 0.3, 0.7, 1];
  const timer = useRef(null);

  const blanked = useMemo(() => {
    const count = Math.round(words.length * percents[stage]);
    return new Set([...words.keys()].sort((a, b) => b - a).slice(0, count));
  }, [stage, words]);

  useEffect(() => {
    if (running) timer.current = setInterval(() => setStage((s) => (s + 1) % 4), 2400);
    else clearInterval(timer.current);
    return () => clearInterval(timer.current);
  }, [running]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400">Fading 암기 훈련</p>
        <span className="text-[11px] text-indigo-600 font-semibold">{Math.round(percents[stage] * 100)}% 가림</span>
      </div>
      <p className="text-base leading-relaxed font-medium text-gray-900 min-h-[3.5rem]">
        {words.map((w, i) => (
          <span key={i} className={`mr-1.5 ${blanked.has(i) ? "text-indigo-300" : ""}`}>{blanked.has(i) ? "____" : w}</span>
        ))}
      </p>
      <button onClick={() => setRunning((r) => !r)} className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold ${running ? "bg-gray-100 text-gray-600" : "bg-indigo-600 text-white"}`}>
        {running ? <Pause size={15} /> : <Play size={15} />}
        {running ? "순환 정지" : "무한 순환 시작 (30 → 70 → 100%)"}
      </button>
    </div>
  );
}

function TrainingTab({ sentence, voice }) {
  return (
    <div className="px-4 pb-6">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-4 text-white mt-3">
        <p className="text-xs opacity-80 mb-1">훈련 문장</p>
        <p className="text-lg font-bold leading-snug">{sentence.text}</p>
        <p className="text-xs opacity-70 mt-1">{sentence.translation}</p>
      </div>
      <InfiniteListening text={sentence.text} voice={voice} />
      <FadingTrainer sentence={sentence} />
      <SoundBreakdown sentence={sentence} />
    </div>
  );
}

/* ============================================================================
   SECTION 11. 발음 평가
   ============================================================================ */

function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [micOk, setMicOk] = useState(true);
  const mr = useRef(null);
  const chunks = useRef([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => chunks.current.push(e.data);
      rec.onstop = () => {
        setAudioURL(URL.createObjectURL(new Blob(chunks.current, { type: "audio/webm" })));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      mr.current = rec;
      setRecording(true);
    } catch { setMicOk(false); setRecording(true); }
  };
  const stop = () => { if (mr.current?.state === "recording") mr.current.stop(); setRecording(false); };
  return { recording, audioURL, micOk, start, stop };
}

function mockScore(sentence, profile) {
  const strict = profile?.purpose === "발음 및 연음 교정" || profile?.weakness === "발음";
  const base = strict ? -6 : 0;
  const accuracy = Math.max(40, 70 + base + Math.floor(Math.random() * 26));
  const fluency = Math.max(40, 65 + base + Math.floor(Math.random() * 30));
  const prosody = Math.max(40, 60 + base + Math.floor(Math.random() * 33));
  const overall = Math.round(accuracy * 0.4 + fluency * 0.3 + prosody * 0.3);
  const weak = [...sentence.vocab].sort(() => 0.5 - Math.random()).slice(0, 2).map((v) => ({
    word: v.word,
    tip: `'${v.word}'에서 강세가 평평하게 눌렸습니다. ${sentence.sound?.pattern || "핵심 음절"}을 참고해 강세 음절은 길고 높게, 나머지는 짧게 흘려보세요.`,
  }));
  let comment = "조금 더 연습이 필요해요. 무한 반복 듣기로 리듬부터 익혀보세요.";
  if (overall >= 90) comment = "완벽에 가까워요. 원어민 수준의 억양입니다.";
  else if (overall >= 75) comment = "원어민이 무리 없이 알아들을 수 있는 수준입니다!";
  else if (overall >= 60) comment = "의미는 전달되지만 강세와 리듬을 더 다듬으면 좋겠어요.";
  return { overall, accuracy, fluency, prosody, weak, comment };
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ScoringTab({ sentence, profile, voice }) {
  const { recording, audioURL, micOk, start, stop } = useRecorder();
  const [result, setResult] = useState(null);
  const [compare, setCompare] = useState(null);

  const toggle = () => {
    if (recording) { stop(); setTimeout(() => setResult(mockScore(sentence, profile)), 500); }
    else { setResult(null); start(); }
  };

  const playCompare = () => {
    setCompare("me");
    const next = () => { setCompare("native"); speak(sentence.text, { voice, onEnd: () => setCompare(null) }); };
    if (audioURL) { const a = new Audio(audioURL); a.onended = next; a.play().catch(next); } else next();
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-gray-50 rounded-2xl p-4 mt-3 text-center">
        <p className="text-xs text-gray-500 mb-1">발음할 문장</p>
        <p className="font-bold text-gray-900">{sentence.text}</p>
        <div className="flex justify-center mt-2"><SpeakButton text={sentence.text} /></div>
      </div>

      {!micOk && <p className="text-[11px] text-amber-600 text-center mt-2">마이크 권한이 없어 시뮬레이션 모드로 채점합니다.</p>}

      <button onClick={toggle} className={`w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-white ${recording ? "bg-rose-500 animate-pulse" : "bg-indigo-600"}`}>
        {recording ? <Square size={18} /> : <Mic size={18} />}
        {recording ? "녹음 중지" : "녹음 시작"}
      </button>

      {result && (
        <div className="mt-5 space-y-3.5">
          <div className="text-center bg-indigo-50 rounded-2xl p-5">
            <p className="text-4xl font-extrabold text-indigo-700">{result.overall}점</p>
            <p className="text-sm text-indigo-600 mt-1 font-medium">{result.comment}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-400">세부 피드백</p>
            <ScoreBar label="정확도 (Accuracy)" value={result.accuracy} />
            <ScoreBar label="유창성 (Fluency)" value={result.fluency} />
            <ScoreBar label="운율·강세 (Prosody)" value={result.prosody} />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-400 mb-2">개선이 필요한 단어</p>
            <div className="space-y-2">
              {result.weak.map((w) => (
                <div key={w.word} className="bg-rose-50 rounded-lg p-2.5">
                  <div className="flex justify-between items-center mb-0.5">
                    <p className="text-sm font-bold text-rose-600">{w.word}</p>
                    <SpeakButton text={w.word} size={15} className="text-rose-500" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{w.tip}</p>
                </div>
              ))}
            </div>
          </div>
          <button onClick={playCompare} disabled={compare !== null} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 text-white text-sm font-semibold disabled:opacity-60">
            <Volume2 size={16} />
            {compare === "me" ? "내 목소리 재생 중..." : compare === "native" ? "원어민 목소리 재생 중..." : "내 목소리 vs 원어민 비교 듣기"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 12. 복습 (에빙하우스)
   ============================================================================ */

function ReviewTab({ store, setStore, virtualNow, advanceDay }) {
  const due = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) <= virtualNow);
  const upcoming = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) > virtualNow);

  const again = (id) => setStore((p) => ({
    ...p,
    items: p.items.map((it) => {
      if (it.id !== id) return it;
      const ns = Math.min(it.stage + 1, REVIEW_INTERVALS_DAYS.length - 1);
      return { ...it, stage: ns, nextReviewAt: addDays(virtualNow, REVIEW_INTERVALS_DAYS[ns]).toISOString() };
    }),
  }));
  const master = (id) => setStore((p) => ({ ...p, items: p.items.map((it) => (it.id === id ? { ...it, mastered: true } : it)) }));

  return (
    <div className="px-4 pb-6">
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5 mt-3">
        <p className="text-xs text-gray-500">가상 학습일 <span className="font-semibold text-gray-800">{virtualNow.toLocaleDateString("ko-KR")}</span></p>
        <button onClick={advanceDay} className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><RotateCcw size={12} /> +1일</button>
      </div>

      <p className="text-xs font-bold text-gray-400 mt-5 mb-2">스마트 리마인드 ({due.length})</p>
      {due.length === 0 && <p className="text-sm text-gray-400 py-8 text-center">지금 복습할 항목이 없어요.</p>}
      <div className="space-y-2.5">
        {due.map((it) => (
          <div key={it.id} className="bg-white border border-indigo-100 rounded-xl p-3.5">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{it.type === "sentence" ? "문장" : "단어"}</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{it.text}</p>
                {it.meaning && <p className="text-xs text-gray-500">{it.meaning}</p>}
              </div>
              <SpeakButton text={it.text} size={16} />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => again(it.id)} className="flex-1 py-2 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold">다시 복습할게요</button>
              <button onClick={() => master(it.id)} className="flex-1 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold flex items-center justify-center gap-1">
                <Check size={13} /> 완전히 알아요
              </button>
            </div>
          </div>
        ))}
      </div>

      {upcoming.length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-400 mt-6 mb-2">예정된 복습 ({upcoming.length})</p>
          <div className="space-y-1.5">
            {upcoming.map((it) => (
              <div key={it.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-sm text-gray-700 truncate mr-2">{it.text}</p>
                <span className="text-[11px] text-gray-400 shrink-0">{new Date(it.nextReviewAt).toLocaleDateString("ko-KR")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 13. 롱폼 롤플레이
   ============================================================================ */

function buildBotTurn(i, saved) {
  const s = saved[i % saved.length];
  const lines = [
    "Hey, got a minute? I wanted to sync on where things stand.",
    `That reminds me — you mentioned something like "${s.text}" before. Does that apply here?`,
    "Makes sense. What would you prioritize if we only had two weeks?",
    `Try putting it the way you practiced: "${s.text}" — would that fit this moment?`,
    "Good. Anything you need from me before we wrap up?",
  ];
  return lines[i % lines.length];
}

function RoleplayTab({ savedSentences, profile }) {
  const enabled = savedSentences.length >= 3;
  const scene = useMemo(() => getRoleplayScene(profile), [profile]);
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  if (!enabled) {
    return (
      <div className="px-4 pb-6">
        <div className="bg-gray-50 rounded-2xl p-6 mt-6 text-center">
          <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-semibold text-gray-600">문장을 3개 이상 저장하면 실전 대화가 열려요</p>
          <p className="text-xs text-gray-400 mt-1">현재 {savedSentences.length}개 저장됨</p>
        </div>
      </div>
    );
  }

  const send = () => {
    if (!input.trim()) return;
    const botIdx = turns.filter((t) => t.from === "bot").length;
    setTurns((p) => [...p, { from: "user", text: input.trim() }, { from: "bot", text: buildBotTurn(botIdx, savedSentences) }]);
    setInput("");
  };

  return (
    <div className="px-4 pb-6">
      <div className="bg-indigo-50 rounded-xl p-3 mt-3">
        <p className="text-[10px] font-bold text-indigo-500 mb-1">상황 설정 · {profile.situation}</p>
        <p className="text-xs text-indigo-800 leading-relaxed">{scene}</p>
      </div>

      {!started ? (
        <button onClick={() => { setStarted(true); setTurns([{ from: "bot", text: buildBotTurn(0, savedSentences) }]); }} className="w-full mt-4 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2">
          <Sparkles size={16} /> 실전 대화 시작
        </button>
      ) : (
        <>
          <div className="mt-3 space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm ${t.from === "user" ? "bg-indigo-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"}`}>
                  {t.text}
                  {t.from === "bot" && <div className="mt-1"><SpeakButton text={t.text} size={14} /></div>}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2 mt-3">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="영어로 답해보세요..." className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
            <button onClick={send} className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><Send size={16} /></button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">저장한 문장을 쓸 수밖에 없는 상황을 AI가 계속 유도합니다 · {turns.length}턴</p>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 14. 메인 탭 (텍스트 + 음성 입력 + 한글 영작)
   ============================================================================ */

function analyzeUserWriting(text, profile, mode = "diary") {
  const raw = (text || "").trim();
  if (!raw) return null;
  const isKo = containsKorean(raw);
  const words = raw.replace(/[^\w\s']/g, " ").split(/\s+/).filter(Boolean);
  const hasSubject = /\b(I|We|They|He|She|It|My|The|Our)\b/i.test(raw);
  const hasVerb = /\b(is|are|was|were|have|has|had|do|did|will|can|could|learned|worked|discussed|met|finished|think|feel)\b/i.test(raw);
  const tips = [];
  if (!hasSubject && !isKo) tips.push("문장 시작에 I / We / The 등 주어를 명확히 두면 더 자연스럽습니다.");
  if (!hasVerb && !isKo) tips.push("동사(learned, discussed, finished 등)가 있어야 완전한 문장이 됩니다.");
  if (isKo) tips.push("한글로 쓰셨네요. 아래 영어 제안을 참고해 다시 써 보세요.");
  if ((profile.weaknesses || []).includes("문법")) tips.push("시제를 하루 전체로 통일했는지 확인해 보세요.");

  let corrected = raw;
  let natural = raw;
  if (isKo) {
    corrected = mode === "diary"
      ? "Today I practiced the sentences I learned and discussed key updates with my team."
      : "I would like to reschedule our meeting to Thursday afternoon.";
    natural = "Wrapped up today by using the phrases I studied — felt more natural than yesterday.";
  } else {
    corrected = raw.replace(/\bi\b/g, "I").replace(/\s+/g, " ").trim();
    if (!/[.!?]$/.test(corrected)) corrected += ".";
    natural = corrected.replace(/I think that /i, "I think ").replace(/very very/i, "really");
  }

  return {
    original: raw,
    corrected,
    natural,
    structure: hasSubject && hasVerb
      ? "S + V (+ O/Adv) — 기본 문장 구조를 갖추고 있습니다."
      : "주어 + 동사 + (목적어/부사) 순서로 완성해 보세요.",
    tips,
    keywordsUsed: words.filter((w) => w.length > 3).slice(0, 5),
  };
}

function WritingPractice({ profile, mode, savedSentences, onClose }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const recRef = useRef(null);
  const sttOk = isSTTSupported();
  const prompt = mode === "diary"
    ? "오늘 배운 문장을 활용해 영어 일기를 3~5문장 써 보세요."
    : "배운 표현을 써서 업무 상황 문장을 만들어 보세요.";
  const hint = savedSentences.length
    ? `힌트: ${savedSentences.slice(-2).map((s) => s.text).join(" / ")}`
    : "먼저 문장을 학습·저장하면 힌트가 표시됩니다.";

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = createRecognizer("en-US");
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const submit = () => {
    const fb = analyzeUserWriting(text, profile, mode);
    setFeedback(fb);
  };

  return (
    <div className="mt-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-bold text-gray-900">{mode === "diary" ? "오늘의 일기 쓰기" : "문장 만들어 보기"}</p>
          <p className="text-xs text-gray-500 mt-0.5">{prompt}</p>
        </div>
        <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
      </div>
      <p className="text-[10px] text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1 mb-2">{hint}</p>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setFeedback(null); }}
        rows={4}
        placeholder="Type or speak in English..."
        className="w-full rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <div className="flex gap-2 mt-2">
        {sttOk && (
          <button onClick={toggleMic} className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 ${listening ? "bg-rose-500 text-white" : "bg-gray-100 text-gray-600"}`}>
            <Mic size={14} /> {listening ? "녹음 중" : "음성 입력"}
          </button>
        )}
        <button onClick={submit} disabled={!text.trim()} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">피드백 받기</button>
      </div>
      {feedback && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 mb-1">교정 문장</p>
            <p className="text-sm font-semibold text-gray-900">{feedback.corrected}</p>
            <SpeakButton text={feedback.corrected} size={14} />
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-600 mb-1">더 자연스러운 표현</p>
            <p className="text-sm text-gray-800">{feedback.natural}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-indigo-600 mb-1">구조</p>
            <p className="text-xs text-indigo-900">{feedback.structure}</p>
          </div>
          {feedback.tips.map((t, i) => (
            <p key={i} className="text-xs text-gray-600">· {t}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposerBox({ profile, onStart, minimal = false }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState(null);
  const recRef = useRef(null);
  const sttOk = isSTTSupported();

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = createRecognizer("ko-KR");
    if (!rec) return;
    recRef.current = rec;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(""));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const handleGo = async () => {
    const t = text.trim();
    if (!t) return;
    if (containsKorean(t)) {
      setTranslating(true);
      const r = await translateKoreanToEnglish(t, profile);
      setTranslating(false);
      setResult(r);
    } else onStart(t, null);
  };

  return (
    <div className={minimal ? "mt-2" : "mt-4"}>
      {!minimal && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-400">오늘 직접 써보고 싶은 문장</p>
          <span className="text-[10px] text-gray-400">한글로 써도 뉘앙스를 살려 영작해 드려요</span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleGo()}
            placeholder={listening ? "듣고 있어요..." : minimal ? "궁금한 문장을 입력하세요 (한글 OK)" : "예: 회의 일정 좀 조정하고 싶은데요"}
            className="w-full pl-3.5 pr-11 py-3 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {sttOk && (
            <button onClick={toggleMic} className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center ${listening ? "bg-rose-500 text-white animate-pulse" : "bg-white text-gray-500 border border-gray-200"}`}>
              <Mic size={15} />
            </button>
          )}
        </div>
        <button onClick={handleGo} disabled={translating} className="px-4 rounded-xl bg-gray-900 text-white text-sm font-semibold shrink-0 disabled:opacity-60">
          {translating ? <Loader2 size={16} className="animate-spin" /> : "시작"}
        </button>
      </div>

      {!sttOk && <p className="text-[10px] text-gray-400 mt-1.5">이 브라우저는 음성 입력을 지원하지 않아요. Chrome / Edge를 권장합니다.</p>}

      {result && (
        <div className="mt-3 bg-white border-2 border-indigo-100 rounded-2xl p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Languages size={14} className="text-indigo-600" />
            <p className="text-xs font-bold text-indigo-600">뉘앙스를 살린 영어 문장</p>
            {result.confidence === "low" && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-auto">정확도 낮음</span>}
          </div>
          <div className="flex justify-between items-start gap-2">
            <p className="text-base font-bold text-gray-900 leading-snug">{result.english}</p>
            <SpeakButton text={result.english} />
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mt-2 bg-gray-50 rounded-lg p-2.5">{result.nuance}</p>

          {result.alternatives?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[11px] font-bold text-emerald-600 mb-1.5">원어민들은 이렇게도 표현해요</p>
              <div className="space-y-1.5">
                {result.alternatives.map((a, i) => (
                  <div key={i} className="bg-emerald-50 rounded-lg p-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium text-gray-900">{a.en}</p>
                      <SpeakButton text={a.en} size={15} className="text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{a.ko}</p>
                    <p className="text-[11px] text-emerald-600 mt-1">TIP · {a.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => onStart(result.english, text.trim())} className="w-full mt-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
            이 문장으로 학습 시작
          </button>
        </div>
      )}
    </div>
  );
}

function HookK({ className, gradientId }) {
  const stroke = `url(#${gradientId})`;
  return (
    <svg viewBox="0 0 38 58" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="6" y1="2" x2="34" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {/* 세로 획 */}
      <path d="M10 4v50" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
      {/* 위쪽 대각선 — 끝이 후크 선장 후크처럼 살짝 말림 */}
      <path
        d="M10 27 19 11Q28 3 25 11"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 아래쪽 대각선 — 일반 k 획 */}
      <path d="M10 27 24 50" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function HookWordmark({ size = "md", showSubtitle = true }) {
  const gradId = React.useId().replace(/:/g, "");
  const cfg = {
    sm: { text: "text-[17px]", k: "h-[22px] w-[14px]", sub: "text-[8px] tracking-[0.28em]", gap: "-ml-px mb-px", sway: false },
    hero: { text: "text-[44px]", k: "h-[52px] w-[32px]", sub: "text-[11px] tracking-[0.42em]", gap: "-ml-1 mb-1", sway: true },
  }[size] || { text: "text-3xl", k: "h-10 w-7", sub: "text-xs tracking-[0.35em]", gap: "-ml-0.5 mb-0.5", sway: false };

  return (
    <div className="inline-flex flex-col items-center select-none">
      <div className="flex items-end justify-center leading-none">
        <span className={`${cfg.text} font-black tracking-[-0.04em] bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent`}>
          Hoo
        </span>
        <HookK
          className={`${cfg.k} ${cfg.gap} drop-shadow-sm${cfg.sway ? " animate-[hook-sway_3s_ease-in-out_infinite]" : ""}`}
          gradientId={gradId}
        />
      </div>
      {showSubtitle && (
        <span className={`${cfg.sub} font-bold text-gray-400 uppercase mt-1.5`}>English</span>
      )}
    </div>
  );
}

function SentenceList({ sentences, activeId, onSelect, badge }) {
  if (!sentences.length) return <p className="text-xs text-gray-400 text-center py-6">표시할 문장이 없어요.</p>;
  return (
    <div className="space-y-2">
      {sentences.map((s) => (
        <button key={s.id} onClick={() => onSelect(s)} className={`w-full text-left p-3 rounded-xl border-2 ${activeId === s.id ? "border-indigo-600 bg-indigo-50" : "border-gray-100 bg-white"}`}>
          {badge && <span className="text-[9px] text-indigo-500 font-bold">{badge}</span>}
          <p className="text-sm font-semibold text-gray-900">{s.text}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.translation}</p>
        </button>
      ))}
    </div>
  );
}

function MainTab({ profile, activeSentence, setActiveSentence, history, onSaveWord, onSaveSentence, savedIds, onStartCustom, savedSentences }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState(null);
  const recommended = useMemo(() => getRecommendedSentences(profile), [profile]);
  const newsSentences = useMemo(() => getNewsSentences(profile), [profile]);
  const weaknesses = profile.weaknesses || [profile.weakness].filter(Boolean);
  const autoOpen = weaknesses.includes("문법") || weaknesses.includes("문장 구성");
  const openMenu = (mode) => { setMenuMode(mode); setMenuOpen(true); };

  return (
    <div className="px-4 pb-6">
      <div className="pt-10 pb-6 text-center">
        <HookWordmark size="hero" />
      </div>
      <ComposerBox profile={profile} onStart={onStartCustom} minimal />
      <button type="button" onClick={() => setMenuOpen((o) => !o)} className="w-full mt-5 py-2.5 text-xs text-indigo-600 font-bold flex items-center justify-center gap-1">
        {menuOpen ? <><ChevronUp size={14} /> 학습 메뉴 접기</> : <>학습 메뉴 보기 <ChevronDown size={14} /></>}
      </button>
      {menuOpen && (
        <>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button onClick={() => openMenu("recommended")} className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-left"><Sparkles size={16} className="text-indigo-600 mb-1" /><p className="text-xs font-bold text-indigo-800">오늘의 추천 3문장</p></button>
            <button onClick={() => openMenu("news")} className="p-3 rounded-2xl bg-rose-50 border border-rose-100 text-left"><Newspaper size={16} className="text-rose-600 mb-1" /><p className="text-xs font-bold text-rose-800">최신 뉴스 3문장</p></button>
            <button onClick={() => openMenu("diary")} className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-left"><PenLine size={16} className="text-amber-600 mb-1" /><p className="text-xs font-bold text-amber-800">오늘의 일기 쓰기</p></button>
            <button onClick={() => openMenu("compose")} className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-left"><Notebook size={16} className="text-emerald-600 mb-1" /><p className="text-xs font-bold text-emerald-800">문장 만들어 보기</p></button>
          </div>
          {menuMode === "recommended" && <div className="mt-4"><p className="text-xs font-bold text-gray-400 mb-2">맞춤 추천 {recommended.length}문장</p><SentenceList sentences={recommended} activeId={activeSentence?.id} onSelect={setActiveSentence} /></div>}
          {menuMode === "news" && <div className="mt-4"><p className="text-xs font-bold text-gray-400 mb-2">최신 뉴스 기반 3문장</p><SentenceList sentences={newsSentences} activeId={activeSentence?.id} onSelect={setActiveSentence} badge="NEWS" /></div>}
          {(menuMode === "diary" || menuMode === "compose") && <WritingPractice profile={profile} mode={menuMode} savedSentences={savedSentences} onClose={() => setMenuMode(null)} />}
        </>
      )}

      {activeSentence && (
        <div className="mt-6 bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400">학습 중인 문장</p>
            {history.some((h) => h.sentenceId === activeSentence.id) && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">이전 학습</span>
            )}
          </div>
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-lg font-bold text-gray-900 leading-snug">{activeSentence.text}</p>
              <p className="text-xs text-gray-500 mt-1">{activeSentence.translation}</p>
              {activeSentence.originKo && <p className="text-[11px] text-gray-400 mt-1">원문: {activeSentence.originKo}</p>}
            </div>
            <SpeakButton text={activeSentence.text} size={20} />
          </div>
          <SentenceDissection sentence={activeSentence} history={history} onSaveWord={onSaveWord} defaultOpen={autoOpen} />
          <button
            onClick={() => onSaveSentence(activeSentence)}
            disabled={savedIds.has(activeSentence.id)}
            className={`w-full mt-4 py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 ${savedIds.has(activeSentence.id) ? "bg-gray-100 text-gray-400" : "bg-indigo-600 text-white"}`}
          >
            {savedIds.has(activeSentence.id) ? <><Check size={15} /> 저장됨</> : <><Star size={15} /> 문장고에 저장하고 훈련 시작</>}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   SECTION 15. 저장소 / 음성 설정 모달
   ============================================================================ */

function NotebookModal({ sentences, words, history, onClose, onMaster, onSelectSentence }) {
  const total = sentences.length + words.length;
  const mastered = [...sentences, ...words].filter((i) => i.mastered).length;
  const studiedIds = new Set(history.map((h) => h.sentenceId));

  const renderEntry = (it, type) => {
    const prev = type === "sentence" && studiedIds.has(it.sourceId);
    return (
      <div key={it.id} className="relative bg-[#fffef8] border border-amber-200/80 rounded-lg px-4 py-3 shadow-sm" style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #f3f4f6 28px)" }}>
        {prev && <span className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">이전 학습</span>}
        <p className="text-sm font-semibold text-gray-900 leading-relaxed">{it.text}</p>
        {it.meaning && <p className="text-xs text-gray-500 mt-1">{it.meaning}</p>}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-100/80">
          <SpeakButton text={it.text} size={14} />
          {type === "sentence" && (
            <button onClick={() => onSelectSentence(it)} className="text-[10px] text-indigo-600 font-bold">복습하기</button>
          )}
          {!it.mastered ? (
            <button onClick={() => onMaster(it.id)} className="ml-auto text-[10px] text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">암기 완료</button>
          ) : (
            <span className="ml-auto text-[10px] text-emerald-600 font-bold flex items-center gap-0.5"><Check size={12} /> 완료</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <BottomSheet title="나의 영어 수첩" onClose={onClose}>
      <div className="bg-indigo-50 rounded-xl p-3 mb-4 flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-indigo-800">총 {total}개 · 암기 {mastered}개</p>
          <p className="text-[10px] text-indigo-500 mt-0.5">언제든지 배운 내용을 복습하세요</p>
        </div>
        <Notebook size={22} className="text-indigo-400" />
      </div>

      <p className="text-xs font-bold text-gray-400 mb-2">저장한 문장 ({sentences.length})</p>
      {sentences.length === 0 ? <p className="text-xs text-gray-400 mb-4">아직 저장한 문장이 없어요.</p> : (
        <div className="space-y-3 mb-5">{sentences.map((s) => renderEntry(s, "sentence"))}</div>
      )}

      <p className="text-xs font-bold text-gray-400 mb-2">저장한 단어 ({words.length})</p>
      {words.length === 0 ? <p className="text-xs text-gray-400">아직 저장한 단어가 없어요.</p> : (
        <div className="space-y-3">{words.map((w) => renderEntry(w, "word"))}</div>
      )}
    </BottomSheet>
  );
}

function VoiceSettings({ voices, selected, onSelect, onClose }) {
  return (
    <BottomSheet title="음성 품질 설정" onClose={onClose}>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          목록 위쪽일수록 자연스러운 음성입니다. 이름에 <b>Natural</b>, <b>Online</b>, <b>Premium</b>이 포함된 항목이 가장 좋습니다.
          {!hasNeuralProvider() && " 최고 음질을 원하면 setNeuralTTSProvider()로 클라우드 TTS를 연결하세요."}
        </p>
      </div>
      {voices.length === 0 && <p className="text-sm text-gray-400 text-center py-8">사용 가능한 음성을 찾지 못했어요.</p>}
      <div className="space-y-1.5">
        {voices.slice(0, 20).map((v) => (
          <div key={v.name} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border-2 ${selected?.name === v.name ? "border-indigo-600 bg-indigo-50" : "border-transparent bg-gray-50"}`}>
            <button onClick={() => onSelect(v)} className="text-left min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{v.name}</p>
              <p className="text-[11px] text-gray-500">{v.lang}{v.localService === false ? " · 온라인 고품질" : " · 기기 내장"}</p>
            </button>
            <SpeakButton text="This is how I sound. Let me read your sentence." size={16} />
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

/* ============================================================================
   SECTION 16. App (최상위 상태 관리)
   ============================================================================ */

const TABS = [
  { key: "main", label: "메인", icon: BookOpen },
  { key: "training", label: "리스닝", icon: Volume2 },
  { key: "scoring", label: "평가", icon: Mic },
  { key: "review", label: "복습", icon: Clock },
  { key: "roleplay", label: "실전대화", icon: MessageCircle },
];

export default function App() {
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("main");
  const [activeSentence, setActiveSentence] = useState(null);
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState(null);
  const [virtualNow, setVirtualNow] = useState(new Date());
  const [store, setStore] = useState({ items: [] });
  const [history, setHistory] = useState([]);
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState(null);

  useEffect(() => { loadVoices().then((vs) => { setVoices(vs); setVoice(vs[0] || null); }); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  // 문장 열람 시마다 문법 이력 축적 → "지난번 사례" 노출에 사용
  useEffect(() => {
    if (!activeSentence) return;
    setHistory((h) => h.some((x) => x.sentenceId === activeSentence.id) ? h : [...h, {
      sentenceId: activeSentence.id,
      text: activeSentence.text,
      grammarKeys: activeSentence.grammarKeys || [],
      at: virtualNow.toISOString(),
    }]);
  }, [activeSentence]);

  const savedSentences = store.items.filter((i) => i.type === "sentence");
  const savedWords = store.items.filter((i) => i.type === "word");
  const savedIds = useMemo(() => new Set(savedSentences.map((i) => i.sourceId)), [store]);
  const dueCount = store.items.filter((i) => !i.mastered && new Date(i.nextReviewAt) <= virtualNow).length;

  const addItem = (payload) => setStore((p) => ({
    ...p,
    items: [...p.items, { id: uid(payload.type), stage: 0, nextReviewAt: addDays(virtualNow, REVIEW_INTERVALS_DAYS[0]).toISOString(), mastered: false, ...payload }],
  }));

  const handleSaveWord = (v, sentence) => {
    if (store.items.some((i) => i.type === "word" && i.text === v.word)) { setToast("이미 단어장에 있어요"); return; }
    addItem({ type: "word", text: v.word, meaning: v.meaning, sourceId: sentence.id });
    setToast(`'${v.word}' 단어장에 저장되었습니다`);
  };

  const handleSaveSentence = (s) => {
    if (savedIds.has(s.id)) return;
    addItem({ type: "sentence", text: s.text, meaning: s.translation, sourceId: s.id });
    setToast("내 문장고에 저장되었습니다");
    const weaknesses = profile.weaknesses || [profile.weakness].filter(Boolean);
    const target = WEAKNESS_TO_TAB[weaknesses[0]] || "main";
    setTab(target === "main" ? "training" : target);
  };

  const handleStartCustom = (englishText, originKo) => {
    const words = englishText.replace(/[.,!?]/g, "").split(" ");
    const keys = [];
    if (/let me/i.test(englishText)) keys.push("letMeStructure");
    if (/could you|can you|would you/i.test(englishText)) keys.push("politeRequest");
    if (/going to|gonna/i.test(englishText)) keys.push("nearFuture");
    if (/\bbut\b|although/i.test(englishText)) keys.push("concessiveContrast");
    if (/should|might want/i.test(englishText)) keys.push("modalSuggestion");
    if (/could|might|may\b/i.test(englishText)) keys.push("conditionalPossibility");
    if (!keys.length) keys.push("phrasalVerb");

    setActiveSentence({
      id: uid("custom"),
      level: profile.level, topic: profile.topic, tone: profile.tone,
      text: englishText,
      originKo,
      translation: originKo || "(직접 입력한 문장)",
      grammarKeys: [...new Set(keys)].slice(0, 3),
      vocab: words.filter((w) => w.length > 3).slice(0, 3).map((w) => ({ word: w.toLowerCase(), meaning: "직접 입력 문장의 어휘", freq: "빈도 데이터 없음" })),
      sound: {
        title: "일반 연음 패턴",
        pattern: "자음 + 모음 → 이어서 발음",
        note: "직접 입력한 문장에는 일반 연음 규칙을 적용합니다. 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하는 지점을 찾아 붙여서 발음해 보세요. 그리고 내용어(명사·동사·형용사)에만 강세를 주고 기능어(전치사·관사·조동사)는 빠르게 흘리세요.",
        examples: [
          { en: "**Can you** hear me okay?", ko: "잘 들리세요?" },
          { en: "Let me **get back** to you.", ko: "확인하고 알려드릴게요." },
        ],
      },
      nativeAlternatives: [],
    });
    setToast("입력한 문장으로 학습을 시작합니다");
  };

  const handleReviewFromNotebook = (item) => {
    const found = SENTENCE_BANK.find((s) => s.id === item.sourceId);
    if (found) setActiveSentence(found);
    else {
      setActiveSentence({
        id: item.sourceId || item.id,
        text: item.text,
        translation: item.meaning || "",
        grammarKeys: ["phrasalVerb"],
        vocab: [],
        nativeAlternatives: [],
      });
    }
    setModal(null);
    setTab("main");
  };

  const markMastered = (id) => setStore((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, mastered: true } : i)) }));

  if (!profile) {
    return (
      <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl">
        <Onboarding onComplete={(a) => { setProfile(normalizeProfile(a)); setTab("main"); }} />
      </div>
    );
  }

  const needSentence = <div className="px-4 pt-12 text-center text-sm text-gray-400">메인 탭에서 문장을 먼저 선택해주세요.</div>;

  return (
    <div className="max-w-[400px] mx-auto min-h-screen bg-white shadow-xl flex flex-col relative">
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-white/95 backdrop-blur z-20 border-b border-gray-100">
        <HookWordmark size="sm" showSubtitle={false} />
        <div className="flex items-center gap-1">
          <button onClick={() => setModal("voice")} className="p-1.5 text-gray-500"><Settings size={18} /></button>
          <button onClick={() => setModal("notebook")} className="relative p-1.5 text-gray-500">
            <Notebook size={19} />{(savedSentences.length + savedWords.length) > 0 && <Badge n={savedSentences.length + savedWords.length} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "main" && (
          <MainTab
            profile={profile} activeSentence={activeSentence} setActiveSentence={setActiveSentence}
            history={history} onSaveWord={handleSaveWord} onSaveSentence={handleSaveSentence}
            savedIds={savedIds} onStartCustom={handleStartCustom} savedSentences={savedSentences}
          />
        )}
        {tab === "training" && (activeSentence ? <TrainingTab sentence={activeSentence} voice={voice} /> : needSentence)}
        {tab === "scoring" && (activeSentence ? <ScoringTab sentence={activeSentence} profile={profile} voice={voice} /> : needSentence)}
        {tab === "review" && <ReviewTab store={store} setStore={setStore} virtualNow={virtualNow} advanceDay={() => setVirtualNow((d) => addDays(d, 1))} />}
        {tab === "roleplay" && <RoleplayTab savedSentences={savedSentences} profile={profile} />}
      </div>

      <div className="border-t border-gray-100 bg-white flex justify-around py-2 sticky bottom-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className="flex flex-col items-center gap-0.5 px-2 py-1 relative">
              <Icon size={19} className={active ? "text-indigo-600" : "text-gray-400"} />
              <span className={`text-[10px] font-medium ${active ? "text-indigo-600" : "text-gray-400"}`}>{t.label}</span>
              {t.key === "review" && dueCount > 0 && (
                <span className="absolute -top-0.5 right-0.5 bg-rose-500 text-white text-[8px] rounded-full w-3.5 h-3.5 flex items-center justify-center">{dueCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {modal === "notebook" && (
        <NotebookModal
          sentences={savedSentences}
          words={savedWords}
          history={history}
          onClose={() => setModal(null)}
          onMaster={markMastered}
          onSelectSentence={handleReviewFromNotebook}
        />
      )}
      {modal === "voice" && <VoiceSettings voices={voices} selected={voice} onSelect={setVoice} onClose={() => setModal(null)} />}

      <Toast message={toast} />
    </div>
  );
}
