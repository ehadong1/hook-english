-- Hook English: 내가 만든 문장과 실수 기록 (실수 노트 + 추천 문장 반영용)
-- Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하세요. (여러 번 실행해도 안전합니다)
create table if not exists public.hook_writing_log (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,                 -- auth.uid()::text (다른 테이블과 같은 방식)
  original text not null,                  -- 내가 쓴 문장
  corrected text,                          -- 교정 문장
  natural_text text,                       -- 더 자연스러운 표현 (natural은 SQL 예약어라 이름을 바꿨어요)
  errors jsonb not null default '[]',      -- [{type, wrong, right, note, grammarKey}]
  created_at timestamptz not null default now()
);
create index if not exists idx_hook_writing_log_device on public.hook_writing_log (device_id, created_at desc);

alter table public.hook_writing_log enable row level security;
drop policy if exists "own rows" on public.hook_writing_log;
create policy "own rows" on public.hook_writing_log
  for all to authenticated
  using (device_id = auth.uid()::text)
  with check (device_id = auth.uid()::text);
