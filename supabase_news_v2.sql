-- Hook English: 뉴스 문장에 "업무 분야(field_tag)" 추가
-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다)
-- 기존 문장(분야 표시 없음)은 그대로 남고, 앱은 분야가 맞는 문장을 먼저 보여 준 뒤 부족하면 예전 방식으로 채웁니다.
alter table public.hook_news_sentences add column if not exists field_tag text;
create index if not exists idx_hook_news_field on public.hook_news_sentences (field_tag, status, level, published_date desc);
