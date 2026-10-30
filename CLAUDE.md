# Hook English — 프로젝트 안내 (Claude Code 등으로 옮길 때 읽는 파일)

비즈니스 영어 학습 웹앱. "하루 3문장, 1년이면 1,000문장". 오너는 비개발자(한국어, 단계별 설명 선호, 간결·근거 중심, 애매하면 질문).

## 구조
- 프론트: Vite + React 19 + TypeScript(strict) + Tailwind v4, `src/` (screens, components, lib, data). 배포: GitHub Pages (https://ehadong1.github.io/hook-english/), main 브랜치 push 시 자동 배포.
- 백엔드: Supabase (Postgres + RLS + 익명 로그인 + Edge Functions). 함수: translate, writing-feedback, roleplay (`supabase/functions/`), 공용 `_shared/guard.ts`(로그인·하루 호출 한도 60/1500·CORS).
- 수집: `news_sentence_builder.py`(매일), `phrase_bank_builder.py`(주 1회) — GitHub Actions. Exa + OpenAI.
- 비밀키는 `.env`(커밋 금지) 와 GitHub Actions secrets, Supabase function secrets.

## 자주 쓰는 명령
- 타입 검사: `npx tsc -b --noEmit` / 빌드: `npm run build`
- 올리기: `./deploy.sh "메모"` (add → commit → push, .env 차단 포함)
- 함수 배포: `supabase functions deploy <이름> --project-ref iwqiygkgpepsbqjhgpqj`

## 합의된 제품 원칙
- 7단계 루틴: 학습(1~4) → 반복(5~7), 용어는 "나만의 영어노트", "나만의 훅 만들기".
- 근거 없는 수치(예: "상위 N%")는 화면에 쓰지 않는다. AI 실패/대체 시 화면에 알린다.
- 표현 뱅크는 `approved`만 노출, "원어민들은 이렇게도 표현해요"에 "최신" 배지로 합침.
- 발음 평가는 유료 기능으로 준비 중(가짜 점수 금지).

## 다음 할 일(우선순위 후보)
1. AI 음성(TTS) — 번역·첨삭과 별도 호출 한도 필요(DB 수정 + 새 Edge Function).
2. 표현 뱅크 수집 문법 유형 확대(현재 approved 4개 유형뿐), 추천 문장도 표현 뱅크에서 가져오기.
3. 뉴스 문장에 수준(level) 필터 추가.
4. 도메인 연결(훅잉글리시), 개인정보처리방침·약관, 결제, 호스팅 이전 검토.
5. 정기 점검: Scheduled 메뉴에서 만든 작업(사이트 정상 여부).
