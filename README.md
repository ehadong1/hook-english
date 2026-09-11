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
- `main.py` 뉴스 파이프라인을 웹앱의 "오늘의 3문장"과 실제로 연결

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

## React + TypeScript + Vite 템플릿 메모

- Oxlint로 린트: `npm run lint`
- 타입 체크: `npx tsc -b --noEmit`
