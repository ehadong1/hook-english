import type {
  FocusArea,
  Interest,
  LearningGoal,
  PronunciationAnalysis,
  SentenceAnalysis,
  SentenceBankEntry,
  SkillLevel,
  UserProfile,
  WordMeaning,
} from '../types';

export const INTEREST_OPTIONS: { id: Interest; label: string; emoji: string }[] = [
  { id: 'travel', label: '여행', emoji: '✈️' },
  { id: 'business', label: '비즈니스', emoji: '💼' },
  { id: 'daily', label: '일상 회화', emoji: '💬' },
  { id: 'hobby', label: '취미·문화', emoji: '🎨' },
  { id: 'study', label: '학업·시험', emoji: '📚' },
  { id: 'career', label: '커리어·면접', emoji: '🎯' },
];

export const LEVEL_OPTIONS: { value: SkillLevel; label: string; description: string }[] = [
  { value: 1, label: '완전 초보', description: '알파벳·기본 인사 수준' },
  { value: 2, label: '기초', description: '간단한 문장은 이해·말하기 가능' },
  { value: 3, label: '중급', description: '일상 대화는 가능, 복잡한 표현은 어려움' },
  { value: 4, label: '중상급', description: '업무·여행에서 대부분 소통 가능' },
  { value: 5, label: '고급', description: '유창하지만 뉘앙스·발음을 다듬고 싶음' },
];

export const SKILL_LABELS = [
  { key: 'listening' as const, label: '듣기', emoji: '🎧' },
  { key: 'speaking' as const, label: '말하기', emoji: '🗣️' },
  { key: 'pronunciation' as const, label: '발음', emoji: '🔊' },
  { key: 'grammar' as const, label: '문법', emoji: '📝' },
];

export const FOCUS_OPTIONS: { id: FocusArea; label: string; description: string }[] = [
  { id: 'listening', label: '리스닝', description: '빠른 발화·연음을 잘 못 알아듣겠어요' },
  { id: 'pronunciation', label: '발음·연음', description: '내 발음이 native처럼 안 들려요' },
  { id: 'grammar', label: '문법', description: '틀리면서 말하는 게 걱정돼요' },
  { id: 'vocabulary', label: '어휘', description: '단어가 부족해요' },
  { id: 'conversation', label: '실전 회화', description: '실제 상황에서 말문이 막혀요' },
];

export const GOAL_OPTIONS: { id: LearningGoal; label: string; emoji: string }[] = [
  { id: 'travel', label: '해외 여행 준비', emoji: '🌍' },
  { id: 'work', label: '업무·비즈니스 영어', emoji: '🏢' },
  { id: 'exam', label: '시험·학업 대비', emoji: '📖' },
  { id: 'daily_chat', label: '자유로운 일상 대화', emoji: '☕' },
  { id: 'self_improvement', label: '취미·자기계발', emoji: '🌱' },
];

interface LessonTemplate {
  analysis: SentenceAnalysis;
  pronunciation: PronunciationAnalysis;
  practiceQuestion: string;
  practiceQuestionKo: string;
}

export const LESSON_TEMPLATES: Record<string, LessonTemplate> = {
  daily_learn: {
    analysis: {
      structure: 'S (I) + V (learned) + O (something new) + Adv (today)',
      words: [
        { word: 'learned', meaning: '배우다, 익히다', frequency: '상위 2%', focusArea: 'vocabulary', isKeyForLevel: true },
        { word: 'something', meaning: '무언가', frequency: '상위 1%', focusArea: 'vocabulary' },
        { word: 'new', meaning: '새로운', frequency: '상위 3%', focusArea: 'vocabulary' },
        { word: 'today', meaning: '오늘', frequency: '상위 1%', focusArea: 'grammar' },
      ],
      usageNote: '미국 일과·학습 대화에서 자연스럽게 쓰이는 상위 1% 구어 패턴입니다.',
    },
    pronunciation: {
      summary: 'learned something → /lɝːndˈsʌmθɪŋ/ — d와 s가 연음(linking)됩니다.',
      linkingNotes: [
        'learned + something: /d/ + /ʌ/ 연음',
        'something + new: /θ/ 뒤 /n/이 약해지며 빠르게 넘어감',
        'today: 문장 끝에서 약하게 줄어듦',
      ],
      examples: [
        { id: 'ex1', sentence: 'I need some time to think.', phenomenon: 'need + some → /niːdsʌm/' },
        { id: 'ex2', sentence: 'She found something interesting.', phenomenon: 'found + something → /faʊndsʌmθɪŋ/' },
        { id: 'ex3', sentence: 'We learned a lot yesterday.', phenomenon: 'learned + a → /lɝːndə/' },
      ],
    },
    practiceQuestion: 'So, what did you learn today?',
    practiceQuestionKo: '그래서, 오늘 뭐 배웠어?',
  },
  daily_coffee: {
    analysis: {
      structure: 'S (I) + V (would like) + O (another cup of coffee)',
      words: [
        { word: 'would', meaning: '~하고 싶다 (정중)', frequency: '상위 1%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'another', meaning: '또 하나의', frequency: '상위 2%', focusArea: 'vocabulary' },
        { word: 'cup', meaning: '잔, 컵', frequency: '상위 5%', focusArea: 'vocabulary' },
        { word: 'coffee', meaning: '커피', frequency: '상위 3%', focusArea: 'vocabulary' },
      ],
      usageNote: '미국 카페에서 가장 흔한 정중한 주문 패턴입니다.',
    },
    pronunciation: {
      summary: 'would like → /wʊdlaɪk/ — d와 l이 연결됩니다.',
      linkingNotes: [
        'would + like: /d/ + /l/ 연음',
        'another + cup: /ð/ + /k/ 사이 /ə/ 약삽입',
        'of coffee: of의 /v/ 약화',
      ],
      examples: [
        { id: 'ex4', sentence: 'I would love to join you.', phenomenon: 'would + love → /wʊdlʌv/' },
        { id: 'ex5', sentence: 'Could I get another one, please?', phenomenon: 'another + one → /ənʌðɚwʌn/' },
        { id: 'ex6', sentence: 'A cup of tea, please.', phenomenon: 'cup + of → /kʌpəv/' },
      ],
    },
    practiceQuestion: 'What would you like to order?',
    practiceQuestionKo: '무엇을 주문하시겠어요?',
  },
  daily_weekend: {
    analysis: {
      structure: 'Wh (What) + V (are) + S (you) + V-ing (planning) + Adv (for the weekend)',
      words: [
        { word: 'planning', meaning: '계획하다', frequency: '상위 4%', focusArea: 'vocabulary', isKeyForLevel: true },
        { word: 'weekend', meaning: '주말', frequency: '상위 2%', focusArea: 'vocabulary' },
        { word: 'for', meaning: '~동안', frequency: '상위 1%', focusArea: 'grammar' },
      ],
      usageNote: '미국 직장·친구 사이 스몰톡 상위 2% 질문 패턴입니다.',
    },
    pronunciation: {
      summary: 'planning for → /plænɪŋfɚ/, for the → /fɚðə/',
      linkingNotes: [
        'planning + for: /ŋ/ + /f/ 연결',
        'for + the: /r/ + /ð/ 연음',
        'the + weekend: the가 /ðə/로 약화',
      ],
      examples: [
        { id: 'ex7', sentence: 'Thanks for the help!', phenomenon: 'for + the → /fɚðə/' },
        { id: 'ex8', sentence: 'I am looking forward to it.', phenomenon: 'looking + forward → /lʊkɪŋfɔrwərd/' },
        { id: 'ex9', sentence: 'Any plans for tonight?', phenomenon: 'plans + for → /plænzfɚ/' },
      ],
    },
    practiceQuestion: 'So, any plans for the weekend?',
    practiceQuestionKo: '주말에 뭐 할 계획 있어?',
  },
  travel_directions: {
    analysis: {
      structure: 'Wh (Could) + S (you) + V (tell) + O (me) + wh-clause (how to get to the station)',
      words: [
        { word: 'Could', meaning: '~해 주시겠어요? (정중)', frequency: '상위 1%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'tell', meaning: '알려주다', frequency: '상위 3%', focusArea: 'vocabulary' },
        { word: 'station', meaning: '역, 정류장', frequency: '상위 8%', focusArea: 'vocabulary' },
        { word: 'get', meaning: '가다, 도달하다', frequency: '상위 1%', focusArea: 'grammar' },
      ],
      usageNote: '여행지에서 길을 물을 때 가장 안전하고 자연스러운 표현입니다.',
    },
    pronunciation: {
      summary: 'Could you → /kʊdʒu/, get to → /ɡɛtə/ — to가 /tə/로 약화됩니다.',
      linkingNotes: [
        'Could + you: /d/ + /j/ 연음 → "cud-yu"',
        'get + to: /t/ + /t/ 중 하나 약화',
        'to the: /təðə/ — to와 the가 한 덩어리',
      ],
      examples: [
        { id: 'ex10', sentence: 'Could you help me out?', phenomenon: 'Could + you → /kʊdʒu/' },
        { id: 'ex11', sentence: 'How do I get to the airport?', phenomenon: 'get + to → /ɡɛtə/' },
        { id: 'ex12', sentence: 'Is it far from here?', phenomenon: 'far + from → /fɑrfɹəm/' },
      ],
    },
    practiceQuestion: 'Excuse me, where are you trying to go?',
    practiceQuestionKo: '실례합니다, 어디 가시려고요?',
  },
  travel_hotel: {
    analysis: {
      structure: 'S (I) + V (have) + O (a reservation) + Prep (under the name)',
      words: [
        { word: 'reservation', meaning: '예약', frequency: '여행 상위 5%', focusArea: 'vocabulary', isKeyForLevel: true },
        { word: 'under', meaning: '~ 이름으로', frequency: '상위 4%', focusArea: 'grammar' },
        { word: 'name', meaning: '이름', frequency: '상위 2%', focusArea: 'vocabulary' },
      ],
      usageNote: '호텔 체크인 시 필수 표현. "under the name"은 미국에서 매우 흔합니다.',
    },
    pronunciation: {
      summary: 'have a → /hævə/, reservation under → /ˌrɛzɚˈveɪʃənˈʌndɚ/',
      linkingNotes: [
        'have + a: /v/ + /ə/ 연음',
        'reservation + under: 강세 이동으로 빠르게 이어짐',
        'under + the: /ndɚðə/',
      ],
      examples: [
        { id: 'ex13', sentence: 'I have a question about my room.', phenomenon: 'have + a → /hævə/' },
        { id: 'ex14', sentence: 'The booking is under Kim.', phenomenon: 'under + Kim → /ʌndɚ/' },
        { id: 'ex15', sentence: 'Do you have any rooms available?', phenomenon: 'have + any → /hævəni/' },
      ],
    },
    practiceQuestion: 'Welcome! Do you have a reservation with us?',
    practiceQuestionKo: '환영합니다! 예약하셨나요?',
  },
  business_meeting: {
    analysis: {
      structure: 'S (Let\'s) + V (touch base) + Adv (later this week)',
      words: [
        { word: "Let's", meaning: '~하자 (제안)', frequency: '비즈니스 상위 3%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'touch', meaning: '접촉하다', frequency: '관용구', focusArea: 'vocabulary' },
        { word: 'base', meaning: '기반 (touch base = 연락하다)', frequency: '관용구', focusArea: 'vocabulary' },
        { word: 'week', meaning: '주', frequency: '상위 2%', focusArea: 'grammar' },
      ],
      usageNote: '미국 직장에서 "회의·연락하자"는 의미의 핵심 관용 표현입니다.',
    },
    pronunciation: {
      summary: 'Let\'s touch → /lets tʌtʃ/, touch base → /tʌtʃbeɪs/',
      linkingNotes: [
        "Let's + touch: s와 t 연결",
        'touch + base: /tʃ/ + /b/ 연음',
        'later this: /leɪtɚðɪs/ — r-th 연음',
      ],
      examples: [
        { id: 'ex16', sentence: "Let's circle back tomorrow.", phenomenon: "Let's + circle → /letsˈsɝkl/" },
        { id: 'ex17', sentence: 'Can we sync up this afternoon?', phenomenon: 'sync + up → /sɪŋkʌp/' },
        { id: 'ex18', sentence: "I'll follow up with you.", phenomenon: 'follow + up → /fɑloʊʌp/' },
      ],
    },
    practiceQuestion: 'When would be a good time to touch base?',
    practiceQuestionKo: '언제 연락하면 좋을까요?',
  },
  business_email: {
    analysis: {
      structure: 'S (I) + V (wanted) + to + V (follow up) + Prep (on our conversation)',
      words: [
        { word: 'wanted', meaning: '~하고 싶었다 (완곡)', frequency: '이메일 상위 5%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'follow', meaning: '따르다, 후속하다', frequency: '비즈니스 핵심', focusArea: 'vocabulary' },
        { word: 'conversation', meaning: '대화', frequency: '상위 6%', focusArea: 'vocabulary' },
      ],
      usageNote: '비즈니스 이메일·미팅에서 후속 연락할 때 가장 무난한 표현입니다.',
    },
    pronunciation: {
      summary: 'wanted to → /wɑnɪtə/, follow up → /fɑloʊʌp/',
      linkingNotes: [
        'wanted + to: /t/ + /t/ 중 t 약화 → "wanna"에 가깝게',
        'follow + up: /w/ + /ʌ/ 연음',
        'on our: /ɑnaʊr/ — n-r 연음',
      ],
      examples: [
        { id: 'ex19', sentence: 'I wanted to check in with you.', phenomenon: 'wanted + to → /wɑnɪtə/' },
        { id: 'ex20', sentence: 'Just following up on my email.', phenomenon: 'following + up → /fɑloʊɪŋʌp/' },
        { id: 'ex21', sentence: 'Let me know if you have questions.', phenomenon: 'let + me → /lɛmi/' },
      ],
    },
    practiceQuestion: 'Did you get a chance to review the proposal?',
    practiceQuestionKo: '제안서 검토해 보셨나요?',
  },
  study_opinion: {
    analysis: {
      structure: 'S (I) + V (think) + (that) + S + V — opinion pattern',
      words: [
        { word: 'think', meaning: '생각하다', frequency: '상위 1%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'because', meaning: '왜냐하면', frequency: '상위 2%', focusArea: 'grammar' },
        { word: 'important', meaning: '중요한', frequency: '상위 4%', focusArea: 'vocabulary' },
      ],
      usageNote: '의견 표현의 기본 틀. 시험·에세이·토론 모두에 필수입니다.',
    },
    pronunciation: {
      summary: 'I think → /aɪθɪŋk/, think that → /θɪŋkðæt/ — th 연속',
      linkingNotes: [
        'I + think: 자연스러운 연결',
        'think + that: /k/ + /ð/ 연음',
        'because: /bɪˈkɔz/ — 두 음절로 명확히',
      ],
      examples: [
        { id: 'ex22', sentence: 'I think we should leave early.', phenomenon: 'think + we → /θɪŋkwi/' },
        { id: 'ex23', sentence: 'I believe it makes sense.', phenomenon: 'believe + it → /bɪˈlivɪt/' },
        { id: 'ex24', sentence: 'In my opinion, it works.', phenomenon: 'in + my → /ɪnmaɪ/' },
      ],
    },
    practiceQuestion: 'What do you think about this topic?',
    practiceQuestionKo: '이 주제에 대해 어떻게 생각하세요?',
  },
  career_intro: {
    analysis: {
      structure: 'S (I) + V (have) + O (experience) + Prep (in) + field',
      words: [
        { word: 'experience', meaning: '경험', frequency: '면접 상위 3%', focusArea: 'vocabulary', isKeyForLevel: true },
        { word: 'working', meaning: '일하는', frequency: '상위 3%', focusArea: 'grammar' },
        { word: 'team', meaning: '팀', frequency: '상위 5%', focusArea: 'vocabulary' },
      ],
      usageNote: '면접·자기소개에서 경력을 설명할 때 핵심 패턴입니다.',
    },
    pronunciation: {
      summary: 'have experience → /hævɪkˈspɪriəns/, experience in → /ɪkˈspɪriənsɪn/',
      linkingNotes: [
        'have + experience: /v/ + /ɪ/ 연음',
        'experience + in: /ns/ + /ɪ/ 연결',
        'working + with: /ŋw/ 연음',
      ],
      examples: [
        { id: 'ex25', sentence: 'I have a background in marketing.', phenomenon: 'have + a → /hævə/' },
        { id: 'ex26', sentence: 'I worked closely with the team.', phenomenon: 'worked + with → /wɝktwɪθ/' },
        { id: 'ex27', sentence: 'My strength is problem solving.', phenomenon: 'strength + is → /strɛŋθɪz/' },
      ],
    },
    practiceQuestion: 'Tell me about your experience in this field.',
    practiceQuestionKo: '이 분야 경험에 대해 말씀해 주세요.',
  },
  hobby_recommend: {
    analysis: {
      structure: 'S (You) + V (should) + V (check out) + O (this place)',
      words: [
        { word: 'should', meaning: '~하면 좋겠다', frequency: '상위 2%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'check', meaning: '확인하다 (check out = 방문해 보다)', frequency: '구어 상위 5%', focusArea: 'vocabulary' },
        { word: 'place', meaning: '장소', frequency: '상위 3%', focusArea: 'vocabulary' },
      ],
      usageNote: '친구에게 추천할 때 자연스러운 구어 표현입니다.',
    },
    pronunciation: {
      summary: 'should check → /ʃʊd tʃɛk/, check out → /tʃɛkaʊt/',
      linkingNotes: [
        'should + check: d 탈락에 가깝게',
        'check + out: /k/ + /aʊ/ 연결',
        'this + place: /ðɪspleɪs/',
      ],
      examples: [
        { id: 'ex28', sentence: 'You gotta see this movie.', phenomenon: 'gotta + see → /ɡɑtəsi/' },
        { id: 'ex29', sentence: 'Have you been there before?', phenomenon: 'been + there → /bɪnðɛr/' },
        { id: 'ex30', sentence: 'It is worth a visit.', phenomenon: 'worth + a → /wɝθə/' },
      ],
    },
    practiceQuestion: 'Have you checked out that new café yet?',
    practiceQuestionKo: '그 새 카페 가 봤어?',
  },
  beginner_greeting: {
    analysis: {
      structure: 'Greeting + Wh (How) + V (are) + S (you)',
      words: [
        { word: 'How', meaning: '어떻게, 어떠세요', frequency: '상위 1%', focusArea: 'grammar', isKeyForLevel: true },
        { word: 'are', meaning: '~이다, ~하다', frequency: '상위 1%', focusArea: 'grammar' },
        { word: 'you', meaning: '당신, 너', frequency: '상위 1%', focusArea: 'vocabulary' },
      ],
      usageNote: '영어 인사의 가장 기본 패턴. 축약형 "How\'re you"도 흔합니다.',
    },
    pronunciation: {
      summary: 'How are → /haʊɑr/, are you → /ɑrju/ — 빠르게 "howarya"처럼 들립니다.',
      linkingNotes: [
        'How + are: /aʊ/ + /ɑr/ 연결',
        'are + you: /r/ + /j/ 연음 → "arya"',
        'Fine, thanks: thanks의 /θ/가 약해질 수 있음',
      ],
      examples: [
        { id: 'ex31', sentence: 'How is it going?', phenomenon: 'How + is → /haʊɪz/' },
        { id: 'ex32', sentence: 'Nice to meet you.', phenomenon: 'meet + you → /miːtʃu/' },
        { id: 'ex33', sentence: 'What is your name?', phenomenon: 'What + is → /wɑtɪz/' },
      ],
    },
    practiceQuestion: 'Hi there! How are you doing today?',
    practiceQuestionKo: '안녕! 오늘 어때?',
  },
};

export const SENTENCE_BANK: SentenceBankEntry[] = [
  {
    id: 's1',
    sentence: 'I learned something new today.',
    korean: '오늘 새로운 걸 배웠어요.',
    level: 2,
    interests: ['daily', 'study', 'hobby'],
    focusAreas: ['vocabulary', 'conversation'],
    goals: ['daily_chat', 'self_improvement'],
    templateKey: 'daily_learn',
  },
  {
    id: 's2',
    sentence: "I'd like another cup of coffee, please.",
    korean: '커피 한 잔 더 주세요.',
    level: 2,
    interests: ['daily', 'travel'],
    focusAreas: ['pronunciation', 'conversation'],
    goals: ['travel', 'daily_chat'],
    templateKey: 'daily_coffee',
  },
  {
    id: 's3',
    sentence: 'What are you planning for the weekend?',
    korean: '주말에 뭐 할 계획이야?',
    level: 3,
    interests: ['daily', 'business', 'hobby'],
    focusAreas: ['listening', 'conversation'],
    goals: ['daily_chat', 'work'],
    templateKey: 'daily_weekend',
  },
  {
    id: 's4',
    sentence: 'Could you tell me how to get to the station?',
    korean: '역까지 어떻게 가는지 알려주시겠어요?',
    level: 3,
    interests: ['travel'],
    focusAreas: ['listening', 'pronunciation', 'conversation'],
    goals: ['travel'],
    templateKey: 'travel_directions',
  },
  {
    id: 's5',
    sentence: 'I have a reservation under the name Kim.',
    korean: '김으로 예약했습니다.',
    level: 3,
    interests: ['travel'],
    focusAreas: ['vocabulary', 'pronunciation'],
    goals: ['travel'],
    templateKey: 'travel_hotel',
  },
  {
    id: 's6',
    sentence: "Let's touch base later this week.",
    korean: '이번 주 후반에 연락하자.',
    level: 4,
    interests: ['business', 'career'],
    focusAreas: ['vocabulary', 'conversation'],
    goals: ['work'],
    templateKey: 'business_meeting',
  },
  {
    id: 's7',
    sentence: 'I wanted to follow up on our conversation.',
    korean: '저희 대화 후속으로 연락드립니다.',
    level: 4,
    interests: ['business', 'career'],
    focusAreas: ['grammar', 'vocabulary'],
    goals: ['work'],
    templateKey: 'business_email',
  },
  {
    id: 's8',
    sentence: 'I think practice is important because it builds confidence.',
    korean: '연습이 중요하다고 생각해요. 자신감이 생기거든요.',
    level: 3,
    interests: ['study', 'daily'],
    focusAreas: ['grammar', 'conversation'],
    goals: ['exam', 'self_improvement'],
    templateKey: 'study_opinion',
  },
  {
    id: 's9',
    sentence: 'I have experience working with international teams.',
    korean: '국제 팀과 일한 경험이 있습니다.',
    level: 4,
    interests: ['career', 'business'],
    focusAreas: ['vocabulary', 'grammar'],
    goals: ['work'],
    templateKey: 'career_intro',
  },
  {
    id: 's10',
    sentence: 'You should check out this place near the park.',
    korean: '공원 근처 이 장소 꼭 가 봐.',
    level: 3,
    interests: ['hobby', 'travel', 'daily'],
    focusAreas: ['pronunciation', 'conversation'],
    goals: ['daily_chat', 'self_improvement'],
    templateKey: 'hobby_recommend',
  },
  {
    id: 's11',
    sentence: 'Hi, how are you doing today?',
    korean: '안녕, 오늘 어때?',
    level: 1,
    interests: ['daily', 'travel', 'study'],
    focusAreas: ['pronunciation', 'listening'],
    goals: ['daily_chat', 'travel'],
    templateKey: 'beginner_greeting',
  },
  {
    id: 's12',
    sentence: 'Nice to meet you. My name is Alex.',
    korean: '만나서 반가워요. 저는 Alex입니다.',
    level: 1,
    interests: ['daily', 'career', 'travel'],
    focusAreas: ['pronunciation', 'grammar'],
    goals: ['travel', 'work'],
    templateKey: 'beginner_greeting',
  },
];

export function assessSkillProfile(profile: UserProfile) {
  const scores = Object.values(profile.skillScores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const overallLevel = Math.round((avgScore + profile.declaredLevel) / 2) as SkillLevel;
  const clampedLevel = Math.min(5, Math.max(1, overallLevel)) as SkillLevel;

  const levelLabels: Record<SkillLevel, { label: string; description: string }> = {
    1: { label: '완전 초보', description: '기본 인사·짧은 문장부터 차근차근' },
    2: { label: '기초', description: '일상 표현을 반복하며 자신감 쌓기' },
    3: { label: '중급', description: '실전 대화·연음 훈련에 집중' },
    4: { label: '중상급', description: '뉘앙스·관용 표현 다듬기' },
    5: { label: '고급', description: '원어민에 가까운 자연스러움 추구' },
  };

  const skillEntries = Object.entries(profile.skillScores) as [keyof typeof profile.skillScores, SkillLevel][];
  const sortedSkills = [...skillEntries].sort((a, b) => a[1] - b[1]);
  const weakest = sortedSkills.slice(0, 2).map(([k]) => {
    const map = { listening: '듣기', speaking: '말하기', pronunciation: '발음', grammar: '문법' };
    return map[k];
  });

  const strengths = sortedSkills
    .slice(-2)
    .reverse()
    .map(([k]) => {
      const map = { listening: '듣기', speaking: '말하기', pronunciation: '발음', grammar: '문법' };
      return map[k];
    });

  const focusLabels = profile.weakAreas.map((a) => FOCUS_OPTIONS.find((f) => f.id === a)?.label ?? a);

  const recommendations: string[] = [];
  if (profile.weakAreas.includes('listening') || profile.weakAreas.includes('pronunciation')) {
    recommendations.push('무한 반복 듣기로 연음·발음 패턴에 귀를 익히세요');
  }
  if (profile.weakAreas.includes('vocabulary')) {
    recommendations.push('문장 속 단어를 탭해 단어장을 채워 보세요');
  }
  if (profile.weakAreas.includes('conversation')) {
    recommendations.push('실전 연습에서 AI와 롤플레잉을 자주 해보세요');
  }
  if (profile.weakAreas.includes('grammar')) {
    recommendations.push('구조 및 해설에서 문법 패턴을 확인하세요');
  }
  if (recommendations.length === 0) {
    recommendations.push('오늘의 추천 문장으로 균형 있게 학습해 보세요');
  }

  return {
    overallLevel: clampedLevel,
    levelLabel: levelLabels[clampedLevel].label,
    levelDescription: levelLabels[clampedLevel].description,
    focusAreas: profile.weakAreas,
    strengths,
    recommendations,
    weakest,
    focusLabels,
  };
}

function scoreSentence(entry: SentenceBankEntry, profile: UserProfile, assessment: ReturnType<typeof assessSkillProfile>): number {
  let score = 0;

  const interestMatches = entry.interests.filter((i) => profile.interests.includes(i)).length;
  score += interestMatches * 4;

  const levelDiff = Math.abs(entry.level - assessment.overallLevel);
  if (levelDiff === 0) score += 5;
  else if (levelDiff === 1) score += 3;
  else if (levelDiff === 2) score += 1;
  else score -= 2;

  const focusMatches = entry.focusAreas.filter((f) => profile.weakAreas.includes(f)).length;
  score += focusMatches * 3;

  if (entry.goals.includes(profile.goal)) score += 4;

  return score;
}

function buildMatchReason(entry: SentenceBankEntry, profile: UserProfile, score: number): string {
  const parts: string[] = [];
  const matchedInterests = entry.interests.filter((i) => profile.interests.includes(i));
  if (matchedInterests.length) {
    const labels = matchedInterests.map((i) => INTEREST_OPTIONS.find((o) => o.id === i)?.label).filter(Boolean);
    parts.push(`${labels.join('·')} 관심사`);
  }
  if (entry.focusAreas.some((f) => profile.weakAreas.includes(f))) {
    const labels = entry.focusAreas
      .filter((f) => profile.weakAreas.includes(f))
      .map((f) => FOCUS_OPTIONS.find((o) => o.id === f)?.label)
      .filter(Boolean);
    parts.push(`${labels[0]} 보완`);
  }
  if (entry.goals.includes(profile.goal)) {
    parts.push('목표에 맞춤');
  }
  return parts.length ? parts.join(' · ') : score > 5 ? '레벨에 적합' : '추천 문장';
}

export function getPersonalizedSentences(profile: UserProfile, count = 3) {
  const assessment = assessSkillProfile(profile);
  const scored = SENTENCE_BANK.map((entry) => ({
    entry,
    score: scoreSentence(entry, profile, assessment),
  }))
    .sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  const usedIds = new Set<string>();

  for (const item of scored) {
    if (selected.length >= count) break;
    if (!usedIds.has(item.entry.id)) {
      selected.push(item);
      usedIds.add(item.entry.id);
    }
  }

  while (selected.length < count && selected.length < SENTENCE_BANK.length) {
    const fallback = scored.find((s) => !usedIds.has(s.entry.id));
    if (!fallback) break;
    selected.push(fallback);
    usedIds.add(fallback.entry.id);
  }

  return selected.map(({ entry, score }) => ({
    entry,
    matchReason: buildMatchReason(entry, profile, score),
    assessment,
  }));
}

export function buildLessonFromEntry(
  entry: SentenceBankEntry,
  profile?: UserProfile,
  matchReason?: string,
) {
  const template = LESSON_TEMPLATES[entry.templateKey] ?? LESSON_TEMPLATES.daily_learn;

  let words: WordMeaning[] = template.analysis.words.map((w) => ({ ...w }));

  if (profile) {
    const weakAreas = profile.weakAreas;
    words = words.sort((a, b) => {
      const aMatch = a.focusArea && weakAreas.includes(a.focusArea) ? 1 : 0;
      const bMatch = b.focusArea && weakAreas.includes(b.focusArea) ? 1 : 0;
      return bMatch - aMatch;
    });

    const sentenceWords = entry.sentence
      .replace(/[^\w\s']/g, '')
      .split(/\s+/)
      .map((w) => w.replace(/'/g, '').toLowerCase());

    words = words.map((w) => {
      if (sentenceWords.includes(w.word.toLowerCase())) return w;
      return w;
    });
  }

  return {
    id: `lesson-${entry.id}-${Date.now()}`,
    sentence: entry.sentence,
    korean: entry.korean,
    analysis: {
      ...template.analysis,
      words,
    },
    pronunciation: template.pronunciation,
    practiceQuestion: template.practiceQuestion,
    practiceQuestionKo: template.practiceQuestionKo,
    matchReason,
  };
}

export function buildLessonFromSentence(sentence: string, profile?: UserProfile) {
  const normalized = sentence.trim().toLowerCase();
  const match = SENTENCE_BANK.find((e) => e.sentence.toLowerCase() === normalized);

  if (match) {
    return buildLessonFromEntry(match, profile);
  }

  const fallbackEntry: SentenceBankEntry = {
    id: 'custom',
    sentence: sentence.trim(),
    korean: '직접 입력한 문장',
    level: profile ? assessSkillProfile(profile).overallLevel : 3,
    interests: profile?.interests ?? ['daily'],
    focusAreas: profile?.weakAreas ?? ['conversation'],
    goals: profile?.goal ? [profile.goal] : ['daily_chat'],
    templateKey: 'daily_learn',
  };

  return buildLessonFromEntry(fallbackEntry, profile);
}

export function getPersonalizedDailyLessons(profile: UserProfile) {
  return getPersonalizedSentences(profile, 3).map(({ entry, matchReason }) =>
    buildLessonFromEntry(entry, profile, matchReason),
  );
}

export function generatePracticeFeedback(
  userTranscript: string,
  profile?: UserProfile,
) {
  const hasContent = userTranscript.trim().length > 5;
  const weakAreas = profile?.weakAreas ?? [];

  let pronunciation =
    '전체적으로 이해 가능합니다. 문장 끝 억양을 살짝 올리면 더 자연스러워요.';
  if (weakAreas.includes('pronunciation')) {
    pronunciation =
      '연음 구간을 천천히 따라 말해 보세요. 특히 단어와 단어 사이를 끊지 않는 연습이 도움됩니다.';
  } else if (weakAreas.includes('listening')) {
    pronunciation =
      '먼저 무한 반복 듣기로 패턴을 익힌 뒤, 똑같은 리듬으로 말해 보세요.';
  }

  let grammar = '기본 문장 구조는 좋아요. 시제와 관사(a, the)를 확인하세요.';
  if (weakAreas.includes('grammar')) {
    grammar =
      '주어-동사 순서를 유지하고, 시제를 일관되게 사용했는지 점검해 보세요. 구조 및 해설을 다시 확인하는 것도 좋습니다.';
  }

  return {
    pronunciation: hasContent ? pronunciation : '녹음이 짧거나 들리지 않았어요. 마이크에 가까이 대고 천천히 다시 말해 보세요.',
    grammar: hasContent ? grammar : '답변을 영어 문장으로 완성해 보세요.',
    overall: hasContent
      ? '잘했어요! 핵심 표현을 사용했고, 한 번 더 반복 연습하면 실전에서도 자신 있게 말할 수 있어요.'
      : '걱정 마세요. 먼저 문장을 따라 읽은 뒤, 다시 녹음해 보세요.',
  };
}

export const INTEREST_TAGS = INTEREST_OPTIONS.map((o) => o.label);
