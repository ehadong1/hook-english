-- Hook English: 표현 뱅크 v2 (상황 태그 + 사용자 제안 + 관리자 검수)
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요. (여러 번 실행해도 안전합니다)
--
-- 1) 표준 상황 태그(situation_tag), 출처 종류(source_type), 제안한 사람(submitted_by) 컬럼 추가
-- 2) 관리자 목록(hook_admins) + 관리자 확인 함수(is_hook_admin)
-- 3) 읽기/쓰기 규칙(RLS):
--    - 누구나: 승인(approved)된 표현 읽기
--    - 로그인한 사용자(익명 제외): 표현 제안(검토 대기로만 저장, 하루 10개, 200자 이내), 내가 제안한 표현 읽기
--    - 관리자: 모든 표현 읽기, 승인/반려(상태 변경)

alter table public.hook_phrase_bank add column if not exists situation_tag text;
alter table public.hook_phrase_bank add column if not exists source_type text not null default 'collector';
alter table public.hook_phrase_bank add column if not exists submitted_by uuid;

create index if not exists idx_hook_phrase_bank_situation_tag on public.hook_phrase_bank (situation_tag);

-- 관리자 목록
create table if not exists public.hook_admins (
  user_id uuid primary key
);
alter table public.hook_admins enable row level security;

drop policy if exists "read own admin row" on public.hook_admins;
create policy "read own admin row" on public.hook_admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_hook_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.hook_admins where user_id = auth.uid());
$$;

-- 운영자(본인) 계정을 관리자로 등록합니다. (이미 있으면 건너뜀)
insert into public.hook_admins (user_id)
select id from auth.users where email = 'hadong2.kim@gmail.com'
on conflict do nothing;

-- 표현 뱅크 읽기: 승인된 것은 누구나, 관리자는 전부, 제안한 사람은 자기 것
drop policy if exists "anon read approved only" on public.hook_phrase_bank;
drop policy if exists "read approved or admin or own" on public.hook_phrase_bank;
create policy "read approved or admin or own" on public.hook_phrase_bank
  for select using (
    status = 'approved'
    or public.is_hook_admin()
    or submitted_by = auth.uid()
  );

-- 표현 제안: 로그인한(익명 아닌) 사용자만, 검토 대기 상태로만, 하루 10개까지
drop policy if exists "users submit phrases" on public.hook_phrase_bank;
create policy "users submit phrases" on public.hook_phrase_bank
  for insert to authenticated
  with check (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and source_type = 'user'
    and status = 'pending_review'
    and submitted_by = auth.uid()
    and char_length(english) between 2 and 200
    and char_length(korean_meaning) between 1 and 200
    and (
      select count(*) from public.hook_phrase_bank p
      where p.submitted_by = auth.uid() and p.created_at > now() - interval '1 day'
    ) < 10
  );

-- 관리자: 상태(승인/반려) 변경
drop policy if exists "admin update phrases" on public.hook_phrase_bank;
create policy "admin update phrases" on public.hook_phrase_bank
  for update to authenticated
  using (public.is_hook_admin())
  with check (public.is_hook_admin());
