/* ============================================================================
   SECTION 3. 문장 데이터 뱅크
   sound: 연음·강세 해부 / nativeAlternatives: 원어민 실사용 대체 표현
   ============================================================================ */

export const SENTENCE_BANK = [
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
