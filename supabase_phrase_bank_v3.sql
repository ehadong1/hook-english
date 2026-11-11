-- Hook English: 표현 뱅크 v3 (최신 표현의 "글 게시일" 기록)
-- Supabase 대시보드 → SQL Editor 에서 실행하세요. (여러 번 실행해도 안전합니다)
-- 최신 수집 표현이 어느 날짜의 글에서 나왔는지 저장해, 나중에 "처음 발견일/최근 등장"을 근거로 보여주는 데 씁니다.

alter table public.hook_phrase_bank add column if not exists source_published_at timestamptz;
create index if not exists idx_hook_phrase_bank_published on public.hook_phrase_bank (source_published_at desc);
