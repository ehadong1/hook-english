-- Hook English 보안 강화 마이그레이션
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요.
--
-- 하는 일
--  1) "누구나 모든 행을 읽고/고치고/지울 수 있던" 임시 규칙을 없애고,
--     "로그인한(익명 로그인 포함) 사용자는 자기 행만" 접근하도록 바꿉니다.
--     (device_id 컬럼에는 이제 브라우저 랜덤값이 아니라 auth.uid() 문자열이 들어갑니다.)
--  2) GPT 호출 횟수 제한용 테이블/함수를 만듭니다 (사용자별 + 서비스 전체 하루 한도).
--
-- 주의: 예전 규칙으로 저장돼 있던 기존 행(예전 랜덤 device_id)은 더 이상
-- 어떤 사용자에게도 보이지 않습니다 (테스트 데이터였다면 문제 없음).
-- 사전 준비: Authentication → Sign In / Providers → "Allow anonymous sign-ins" 켜기

-- 1) 사용자별 접근 규칙 --------------------------------------------------------
drop policy if exists "anon full access" on public.hook_profiles;
drop policy if exists "anon full access" on public.hook_items;
drop policy if exists "anon full access" on public.hook_history;

drop policy if exists "own rows" on public.hook_profiles;
create policy "own rows" on public.hook_profiles
  for all to authenticated
  using (device_id = auth.uid()::text)
  with check (device_id = auth.uid()::text);

drop policy if exists "own rows" on public.hook_items;
create policy "own rows" on public.hook_items
  for all to authenticated
  using (device_id = auth.uid()::text)
  with check (device_id = auth.uid()::text);

drop policy if exists "own rows" on public.hook_history;
create policy "own rows" on public.hook_history
  for all to authenticated
  using (device_id = auth.uid()::text)
  with check (device_id = auth.uid()::text);

-- 2) GPT 호출 횟수 제한 ---------------------------------------------------------
create table if not exists public.hook_usage (
  user_id uuid not null,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);

-- 정책을 하나도 만들지 않음 = 앱(anon/authenticated)이 이 테이블을 직접 못 건드림.
-- 아래 security definer 함수를 통해서만 올라갑니다.
alter table public.hook_usage enable row level security;

create or replace function public.hook_consume_quota(p_user_limit int, p_global_limit int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  global_id constant uuid := '00000000-0000-0000-0000-000000000000';
  u int;
  g int;
begin
  if uid is null then
    return 'unauthenticated';
  end if;

  insert into hook_usage (user_id, day, calls) values (uid, current_date, 1)
    on conflict (user_id, day) do update set calls = hook_usage.calls + 1
    returning calls into u;
  if u > p_user_limit then
    return 'user_limit';
  end if;

  insert into hook_usage (user_id, day, calls) values (global_id, current_date, 1)
    on conflict (user_id, day) do update set calls = hook_usage.calls + 1
    returning calls into g;
  if g > p_global_limit then
    return 'global_limit';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.hook_consume_quota(int, int) from public, anon;
grant execute on function public.hook_consume_quota(int, int) to authenticated;

-- (선택) 예전 Streamlit 앱(app.py/main.py)이 쓰던 hook_sentences 테이블은 지금
-- RLS가 꺼진 "UNRESTRICTED" 상태라 누구나 읽고 쓸 수 있습니다. 예전 앱을 더 안
-- 쓴다면 아래 두 줄의 주석을 풀어 막으세요 (풀면 main.py의 쓰기는 service_role
-- 키가 있어야 동작합니다).
-- alter table public.hook_sentences enable row level security;
-- create policy "read all" on public.hook_sentences for select using (true);
