-- Hook English: 약관·개인정보 동의 기록
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요. (한 번만)
-- 누가(user_id) 언제(accepted_at) 어떤 버전의 약관·방침에 동의했는지 남깁니다.

create table if not exists public.hook_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_hook_consents_user on public.hook_consents (user_id);

alter table public.hook_consents enable row level security;

-- 로그인한 사용자는 "자기 동의 기록"만 넣고 볼 수 있습니다. (수정·삭제는 불가)
drop policy if exists "insert own consent" on public.hook_consents;
create policy "insert own consent" on public.hook_consents
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "read own consent" on public.hook_consents;
create policy "read own consent" on public.hook_consents
  for select to authenticated using (user_id = auth.uid());
