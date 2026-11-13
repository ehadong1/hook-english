-- Hook English 표현 뱅크 v4: 수준·업무 분야 라벨 + 품질 점수
-- Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하세요. (여러 번 실행해도 안전합니다)
alter table public.hook_phrase_bank add column if not exists level_band text;   -- 왕초보 / 기초 회화 / 중상급 (앱 설문 수준과 같은 3구간)
alter table public.hook_phrase_bank add column if not exists field_tag text;    -- 설문의 업무 영역 12개 중 하나, 범용이면 '공통'
alter table public.hook_phrase_bank add column if not exists quality jsonb;     -- 2차 검수 점수(자연스러움·실용성·수준·분야·번역)

create index if not exists idx_hook_phrase_bank_level_field on public.hook_phrase_bank (level_band, field_tag) where status = 'approved';
