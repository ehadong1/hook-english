
/* ============================================================================
   SECTION 1. 온보딩 정밀 서베이 설정 (7문항)
   각 답변은 profile 객체에 저장되어 콘텐츠 생성 로직에 실제로 반영됩니다.
   ============================================================================ */

export const SURVEY_QUESTIONS = [
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

export const LEVEL_TO_LEGACY: Record<string, string> = {
  L1: "왕초보", L2: "왕초보", L3: "왕초보",
  L4: "기초 회화", L5: "기초 회화",
  L6: "중상급", L7: "중상급", L8: "중상급", L9: "중상급",
};

export const TOPIC_TO_BANK: Record<string, string> = {
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

export const TIME_TO_COUNT: Record<string, number> = { "5분 이하": 2, "10~15분": 3, "30분 이상": 5 };
export const WEAKNESS_TO_TAB: Record<string, string> = { 듣기: "training", 발음: "scoring", "문장 구성": "main", 문법: "main", 말하기: "scoring", 어휘: "main", "실전 회화": "roleplay" };
