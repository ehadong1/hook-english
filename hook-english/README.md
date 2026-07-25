# Hook English (Expo) V2

React Native Expo MVP의 V2 업데이트 모듈입니다. 기존 저장소가 다른 경로에 있다면 아래 파일들을 **동일 경로 구조로 이식**하면 됩니다.

## 이번 스프린트 구현 범위 (#1, #2)

### 1. 음질 개선 + TTS 캐싱

| 파일 | 역할 |
|------|------|
| `src/services/tts/ttsService.ts` | **진입점** — 로컬 → Supabase → OpenAI TTS 순서 재생 |
| `src/services/tts/localTtsCache.ts` | `expo-file-system` 로컬 MP3 캐시 |
| `src/services/tts/supabaseTtsCache.ts` | Storage + `tts_audio_cache` 메타 조회/업로드 |
| `src/services/tts/openaiTts.ts` | OpenAI `tts-1` API 호출 (expo-speech 대체) |
| `src/services/tts/cacheKey.ts` | 문장+voice+model SHA256 해시 |
| `src/hooks/useCachedTTS.ts` | 화면에서 쓰는 TTS 훅 (무한 반복 포함) |

**기존 MVP에서 제거/교체**

- `expo-speech` import 및 `Speech.speak()` 호출부 → `useCachedTTS().speak()` / `playCachedSpeech()`
- 리스닝/문장 재생 컴포넌트의 TTS 호출만 위 훅으로 일괄 교체

**환경 변수** (`.env.example` 참고)

- `EXPO_PUBLIC_OPENAI_API_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

**Supabase**

- `supabase/schema.sql` 의 `tts_audio_cache` 테이블 + Storage 버킷 `tts-audio-cache`

### 2. Tinder 스타일 단어장

| 파일 | 역할 |
|------|------|
| `src/screens/VocabularySwipeScreen.tsx` | `react-native-deck-swiper` 메인 UI |
| `src/components/vocab/VocabCardView.tsx` | 한글/포멀/캐주얼/문법 팁 카드 |
| `src/store/vocabularyStore.ts` | 스와이프 상태 (`mastered` / `review_later`) |
| `app/vocabulary.tsx` | Expo Router 화면 연결 |

**스와이프 규칙**

- **오른쪽** → `markMastered()` → `status: mastered`
- **왼쪽** → `markReviewLater()` → `status: review_later`, `nextReviewAt +1일`

**기존 MVP에서 교체**

- Vocabulary 리스트 Screen → `VocabularySwipeScreen` 으로 교체
- 단어 모델에 `formalEn`, `casualEn`, `grammarTip`, `status` 필드 추가

## 실행

```bash
cd hook-english
cp .env.example .env   # 키 입력
npm install
npx expo start
```

- `/` — TTS 캐싱 데모
- `/vocabulary` — 스와이프 단어장

## 다음 스프린트 (#3, #4) 예정 파일

- `src/screens/PracticeQuizScreen.tsx` — Stateless 상황 질문 + STT + 키워드 매칭
- `src/services/phrases/phraseCacheService.ts` — `global_phrase_cache` 조회 후 LLM fallback

## 기존 Hook English repo가 따로 있는 경우

Cursor 워크스페이스에 Expo MVP 본체가 없어 `english-repeat-app/hook-english/` 아래에 V2 패치를 추가했습니다. **실제 MVP 저장소 경로**를 워크스페이스로 열어 주시면, 동일 변경을 그 repo에 직접 merge 해 드릴 수 있습니다.
