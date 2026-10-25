# Hook English

출퇴근길 10분, 오늘 못했던 그 말을 실전 비즈니스 영어로 낚아채는(Hook) 개인화 반복 학습 앱.

- 웹앱: Vite + React + TypeScript + Tailwind (이 저장소 루트, `src/`)
- 모바일(Expo) 프로토타입: `hook-english/` 폴더
- 데이터 수집 실험 스크립트(Python): `main.py`(뉴스→AI 문장 추출→Supabase 저장), `app.py`(Streamlit 뷰어)

## 시작하기

```bash
npm install
npm run dev
```

## 환경변수 (.env)

`.env` 파일에 아래 값들이 필요합니다.

| 변수 | 용도 | 어디서 쓰이나 |
|---|---|---|
| `OPENAI_API_KEY` | 뉴스에서 문장 추출 | `main.py` (Python, 서버/CLI 전용) |
| `EXA_API_KEY` | 웹 리서치 | `main.py` (Python) |
| `SUPABASE_URL`, `SUPABASE_KEY` | DB 저장 | `main.py`, `app.py` (Python) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 웹앱 데이터 영구 저장 | `src/` (브라우저) |

**중요**: Vite는 `VITE_` 접두사가 붙은 변수만 브라우저 번들에 노출합니다. `OPENAI_API_KEY` 같은 값은 절대 `VITE_` 접두사를 붙여 프론트엔드에서 쓰지 마세요 (브라우저에서 그대로 노출됩니다). `VITE_SUPABASE_ANON_KEY`에는 Supabase 대시보드 → Settings → API 의 **anon/public 키**만 넣고, `service_role` 키는 절대 넣지 마세요.

## 웹앱 데이터 영구 저장 (Supabase)

기존에는 온보딩 결과·저장한 단어/문장·복습 기록이 전부 브라우저 메모리에만 있어서 새로고침하면 사라졌습니다. 이제 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`를 설정하면 자동으로 Supabase에 저장/복원됩니다 (설정하지 않으면 예전처럼 로컬 전용 모드로 동작).

1. Supabase 대시보드 → SQL Editor에서 `supabase_web_schema.sql` 파일 내용을 실행해 테이블 3개(`hook_profiles`, `hook_items`, `hook_history`)를 만듭니다.
2. `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 채웁니다.
3. `npm run dev`로 재시작 후 온보딩을 완료하고 문장/단어를 저장해본 뒤, 새로고침해도 그대로 남아있는지 확인합니다.

아직 로그인 기능은 없습니다 — 브라우저에 저장되는 임의의 `device_id`(랜덤 UUID)로 데이터를 구분합니다. 기기를 바꾸거나 브라우저 데이터를 지우면 이전 기록과 연결되지 않습니다. 관련 코드: `src/lib/deviceId.ts`, `src/lib/supabaseClient.ts`, `src/lib/persistence.ts`.

### 다음 단계 (아직 안 된 것)

- 이메일/소셜 로그인 (device_id → 실제 계정으로 전환, RLS를 auth.uid() 기반으로 강화)
- 실제 발음 평가 API 연동 (`src/App.tsx`의 평가 탭은 현재 임의 점수 mock)
- 클라우드 TTS(Azure/OpenAI) 연동 (현재는 브라우저 내장 `speechSynthesis` 사용)
- 표현 뱅크(phrase bank)를 실제 GPT 호출의 RAG 컨텍스트로 연결 (지금은 수집만 됨, translate/writing-feedback Edge Function이 아직 참조 안 함)

## 표현 뱅크(phrase bank) 수집 — 도메인 지식 쌓기

GPT가 매번 처음부터 지어내는 대신, 실제 원어민이 쓴 예문을 참고하도록 만들기 위한
파이프라인입니다. Exa로 실제 비즈니스 영어 예문을 검색 → GPT-4o-mini가 그 안에서
진짜 쓸만한 문장만 추출 + 1~5점 루브릭 채점 → Supabase `hook_phrase_bank` 테이블에 저장.
4점 이상만 자동 승인(`approved`)되고, 나머지는 `pending_review`로 남아 나중에 사람이 한 번
더 검토하도록 설계했습니다 (GPT 자기 검수만 믿으면 안 된다는 게 실제 연구로도 확인된 내용이라
이렇게 안전장치를 뒀습니다).

**주의**: 이 스크립트는 Claude가 대신 실행해줄 수 없습니다 — Claude가 작업하는 샌드박스는
Exa API로 나가는 외부 요청이 막혀 있어서, 반드시 대표님 컴퓨터(Cursor 터미널)에서 직접
실행해야 합니다.

1. Supabase 대시보드 → SQL Editor에서 `supabase_phrase_bank_schema.sql` 실행 (테이블 생성)
2. `.env`에 `SUPABASE_SERVICE_ROLE_KEY` 채우기 (Settings → API Keys → Legacy anon,
   service_role API keys 탭에서 service_role 키 복사 — 이 키는 절대 프론트엔드 코드나
   `VITE_` 변수에 넣지 마세요)
3. 패키지 설치:
   ```bash
   pip install requests openai supabase python-dotenv --break-system-packages
   ```
4. 실행:
   ```bash
   python3 phrase_bank_builder.py
   ```
5. 터미널에 각 항목별 점수/저장 결과가 출력됩니다. 끝나면 Supabase 대시보드 →
   Table Editor → `hook_phrase_bank`에서 결과 확인, `pending_review` 항목은 훑어보고
   `status`를 `approved`/`rejected`로 직접 바꿔주면 좋습니다.

첫 실행은 4개 문법 카테고리(`politeRequest`, `idiomaticExpression`, `concessiveContrast`,
`modalSuggestion`)만 파일럿으로 도는 소규모 실행입니다 (`phrase_bank_builder.py`의
`GRAMMAR_TAXONOMY` 참고). 결과 품질을 보고 나머지 카테고리를 추가하면 됩니다.

### 검수 2단계 (self-review 편향 방지)

1차로 GPT-4o-mini가 예문을 뽑고 스스로 점수를 매기는데, 같은 모델이 자기 결과를
후하게 평가하는 경향(self-enhancement bias)이 실제로 확인돼서 아래 2단계를 추가했습니다.

1. **기계 키워드 필터** — `grammar_key`가 요구하는 핵심 단어(예: concessiveContrast면
   but/although/though)가 실제 문장에 있는지 정규식으로 확인. 없으면 자동 `rejected`.
2. **독립 2차 검수** — 1차와 다른 모델(gpt-4o)이 1차 점수를 모르는 채로 처음부터 다시
   채점. "문법 규칙을 설명만 하는 메타 문장"(예: "You should, you need to, and you have
   to are all acceptable.")도 여기서 걸러냅니다.

1차·2차 점수가 둘 다 기준 이상이면 `approved`, 기계 필터/메타 문장 판정이면 `rejected`,
그 외는 `pending_review`로 남아 사람이 최종 확인합니다.

### 자동으로 주기적으로 수집하기 (GitHub Actions)

`.github/workflows/phrase-bank-cron.yml`이 매주 월요일 자동으로
`phrase_bank_builder.py`를 실행하도록 만들어져 있습니다 (수동 실행도 가능).
이걸 켜려면 GitHub 저장소 Settings → Secrets and variables → Actions에서
아래 4개를 등록하세요 (모두 `.env`에 있는 값 그대로):

- `EXA_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

등록하면 Actions 탭 → "Phrase Bank Collector" → "Run workflow"로 바로 테스트 실행도
가능하고, 이후엔 매주 자동으로 새 표현을 모아 `pending_review` 상태로 쌓아둡니다
(계속 사람이 가끔 훑어보고 승인/거부하는 걸 권장 — 완전 무인 자동화는 아직 이릅니다).

## 오늘의 뉴스 3문장 (자동 수집 + 실제 앱 연결)

메인 화면의 "최신 뉴스 3문장" 메뉴가 실제 오늘자 뉴스 기반 문장을 보여주도록
연결했습니다. 구조는 표현 뱅크와 거의 동일합니다.

1. Supabase SQL Editor에서 `supabase_news_sentences_schema.sql` 실행 (테이블 생성)
2. `.env`에 이미 `EXA_API_KEY` / `OPENAI_API_KEY` / `SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY`가 있다면(표현 뱅크 때 추가한 것) 추가 작업 없음
3. 로컬에서 한 번 테스트:
   ```bash
   python3 news_sentence_builder.py
   ```
4. GitHub 저장소에 표현 뱅크용으로 이미 4개 secrets를 등록했다면, 뉴스 수집도
   **같은 secrets를 그대로 재사용**해서 바로 자동 실행됩니다 — 추가 등록 불필요.
   `.github/workflows/news-sentences-cron.yml`이 매일 자동으로 실행됩니다
   (Actions 탭 → "News Sentences Collector" → "Run workflow"로 수동 테스트도 가능).

**프론트엔드 동작 방식**: `src/App.tsx`의 "최신 뉴스 3문장"은 평소엔 기존 정적
`SENTENCE_BANK`를 바로 보여주다가, Supabase에 검수 완료(`approved`)된 뉴스 문장이
있으면 백그라운드에서 조용히 그걸로 교체합니다. 그래서 Supabase가 아직 비어있거나
실패해도 화면이 비지 않습니다. 사용자의 온보딩 업종(`topics`)을
`TOPIC_TO_BANK`로 매핑한 카테고리(`비즈니스/IT 트렌드` 등) 기준으로 필터링해서
보여줍니다.

**검수 상태 확인**: Supabase Table Editor → `hook_news_sentences`에서
`pending_review` 항목을 가끔 훑어보고 `approved`/`rejected`로 바꿔주세요. 이
테이블은 실제 사용자(친구들)에게 바로 노출되는 콘텐츠라, 표현 뱅크보다 더
보수적으로 검수하는 걸 권장합니다.

## 한글 입력 → 실제 GPT-4o-mini 연결 (Supabase Edge Function)

메인 화면 상단의 "오늘 직접 써보고 싶은 문장" 입력창(한글로 쓰면 뉘앙스를 살려 영작)은
`supabase/functions/translate`라는 **Supabase Edge Function**을 통해 실제 GPT-4o-mini를 호출합니다.
`OPENAI_API_KEY`는 이 서버 함수 안에만 저장되고 브라우저에는 절대 노출되지 않습니다.

이 기능을 켜려면 대표님 맥의 터미널에서 아래 단계를 한 번만 진행하면 됩니다.
(모두 `~/Projects/english-repeat-app` 폴더 안에서 실행하세요.)

1. **Supabase CLI 설치** (아직 없다면)
   ```bash
   brew install supabase/tap/supabase
   ```
2. **로그인** — 브라우저가 열리면 Supabase 계정으로 로그인/승인
   ```bash
   supabase login
   ```
3. **Project ID 확인** — Supabase 대시보드 → 왼쪽 아래 ⚙️ Project Settings → General 에서
   "Project ID" 값을 복사해두세요. (이미 `.env`의 `SUPABASE_URL`에 쓰인 `https://<Project ID>.supabase.co`와 동일한 값입니다.)
4. **OPENAI_API_KEY를 서버 시크릿으로 등록** — `.env`에 있는 `OPENAI_API_KEY` 값을 그대로 사용합니다.
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-여기에-키값 --project-ref <Project ID>
   ```
5. **함수 배포**
   ```bash
   supabase functions deploy translate --project-ref <Project ID>
   ```
6. `npm run dev`로 앱을 새로고침하고, 메인 화면 입력창에 한글 문장을 입력해보세요.
   실제 GPT-4o-mini 응답이 오면 정상 연결된 것입니다. (Supabase 환경변수가 없으면 이전처럼
   로컬 패턴 기반 번역으로 자동 대체되어 앱이 죽지 않습니다.)

배포/시크릿 설정 후 결과가 이상하면 다음으로 확인하세요.
```bash
supabase functions logs translate --project-ref <Project ID>
```

## 웹앱을 서버(GitHub Pages)에 올리기

지금은 `npm run dev`로 대표님 맥에서만 실행됩니다. 아래처럼 하면 실제 URL로 접속되는
"서버 버전"이 만들어집니다. GPT 연결(위 Edge Function)은 이미 Supabase 서버에서 돌고 있어서
이 배포와 무관하게 계속 동작합니다 — 여기서 배포하는 건 화면(프론트엔드)뿐입니다.

준비된 것: `.github/workflows/deploy-pages.yml` (GitHub Actions로 자동 빌드·배포),
`vite.config.ts`에 이미 `https://ehadong1.github.io/hook-english/` 주소로 배포되도록 설정되어 있습니다.

**대표님이 GitHub 웹사이트에서 한 번만 해야 할 일:**

1. **저장소 Secrets 등록** — `github.com/ehadong1/hook-english` → Settings → Secrets and variables → Actions →
   "New repository secret"으로 2개 추가 (값은 대표님 `.env` 파일에 있는 것과 동일):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. **Pages 활성화** — 같은 저장소 Settings → Pages → "Build and deployment" → Source를
   **GitHub Actions**로 선택.
3. **main 브랜치로 병합/푸시** — 지금 작업 내용은 `cursor/hook-wordmark-logo` 브랜치에 있고
   `main`은 그보다 뒤처져 있습니다. Cursor 터미널에서:
   ```bash
   git add -A && git commit -m "Supabase 연동 + GPT-4o-mini 연결 + Pages 배포"
   git push origin cursor/hook-wordmark-logo
   git checkout main
   git merge cursor/hook-wordmark-logo
   git push origin main
   ```
4. GitHub 저장소 → **Actions** 탭에서 "Deploy to GitHub Pages" 워크플로가 자동으로 실행되는지 확인.
   초록 체크가 뜨면 **https://ehadong1.github.io/hook-english/** 에서 접속 가능합니다.
5. 앞으로는 `main`에 push할 때마다 자동으로 다시 배포됩니다.

**공개 범위 참고**: 저장소가 Public이라 이 Pages 주소도 (링크를 아는 사람은 누구나) 접속 가능한
상태입니다. 검색엔진에 노출되거나 어디에 홍보되지 않는 한 실제로 찾아올 사람은 없지만,
완전히 비공개로 막고 싶다면 나중에 저장소를 Private로 바꾸고 GitHub Pro(유료)로 전환하거나,
Vercel/Netlify의 배포 보호(비밀번호) 기능이 있는 플랜으로 옮기는 방법이 있습니다.

## 코드 구조 (폴더 지도)

```
src/
  App.tsx            최상위 상태(로그인, 저장 데이터, 탭)와 화면 연결
  types.ts           공통 타입
  screens/           화면: Onboarding(2페이지) · Main · Grammar(구조·해설) · Training(리스닝)
                     · Scoring(따라 말하기·비교 듣기) · Review(복습) · Roleplay(실전 대화)
  components/        공통 UI(common), 모달(Modals), 학습 루틴 안내(RoutineGuide)
  data/              설문 항목(survey), 문법 설명(grammar), 학습 문장(sentences)
  lib/               supabaseClient(익명 로그인) · persistence(DB 읽기/쓰기) · llmProvider(Edge Function 호출)
                     · translate · speech · personalization
supabase/functions/  translate · writing-feedback · roleplay · _shared/guard.ts(로그인 확인 + 하루 호출 한도)
```

- 모든 소스 파일은 타입 검사를 켠 상태입니다 (`npx tsc -b --noEmit`).
- 색은 `src/index.css`의 `@theme`(brand-*, accent-*)만 바꾸면 앱 전체가 함께 바뀝니다.
- `?dev=1`을 주소 끝에 붙이면 복습 탭에 개발용 "+1일" 버튼이 나타납니다 (일반 사용자에게는 안 보임).
- 쓰이지 않는 템플릿 파일(`src/assets/hero.png`, `react.svg`, `vite.svg`, `public/icons.svg`)은 지워도 됩니다.

## 보안 모델과 호출 한도

- 로그인 화면 없이 **익명 로그인**으로 브라우저마다 사용자(auth.uid)를 만들고, DB 규칙(RLS)은 "내 행만" 허용합니다 (`supabase_security_migration.sql`).
- Edge Function(`translate`, `writing-feedback`, `roleplay`)은 로그인한 사용자만 호출할 수 있고, 하루 사용자당 60회 · 서비스 전체 1,500회로 제한됩니다 (`supabase/functions/_shared/guard.ts` 맨 위 숫자로 조절).
- 허용 도메인(CORS)도 `guard.ts`의 `ALLOWED_ORIGINS`에 있습니다. **도메인을 새로 연결하면 여기에 추가하고 함수를 다시 배포해야 합니다.**
- 봇이 익명 계정을 계속 만드는 것까지 막으려면 Supabase Authentication의 CAPTCHA를 켜야 합니다 (아직 안 켬).

## 실전 대화 (roleplay) 배포

```bash
supabase functions deploy roleplay --project-ref <PROJECT_ID>
```

저장한 문장 중 최근 3개를 대화 속에서 자연스럽게 쓰도록 유도합니다. AI를 못 쓰면(한도 초과/연결 문제) 고정 대본으로 이어가고 화면에 그 사실을 표시합니다.

## React + TypeScript + Vite 템플릿 메모

- Oxlint로 린트: `npm run lint`
- 타입 체크: `npx tsc -b --noEmit`
