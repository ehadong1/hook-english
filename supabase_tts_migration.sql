-- Hook English: AI 음성(tts) 준비
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요. (한 번만)
--  1) 음성 전용 하루 호출 한도 (번역·첨삭·대화 한도와 따로 셉니다)
--  2) 만든 음성 파일을 저장해 두는 공개 저장소(tts) 만들기

-- 1) 음성 전용 한도 --------------------------------------------------------------
create table if not exists public.hook_tts_usage (
  user_id uuid not null,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);

-- 정책을 만들지 않음 = 앱이 이 테이블을 직접 못 건드림 (아래 함수로만 올라감)
alter table public.hook_tts_usage enable row level security;

create or replace function public.hook_consume_tts_quota(p_user_limit int, p_global_limit int)
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

  insert into hook_tts_usage (user_id, day, calls) values (uid, current_date, 1)
    on conflict (user_id, day) do update set calls = hook_tts_usage.calls + 1
    returning calls into u;
  if u > p_user_limit then
    return 'user_limit';
  end if;

  insert into hook_tts_usage (user_id, day, calls) values (global_id, current_date, 1)
    on conflict (user_id, day) do update set calls = hook_tts_usage.calls + 1
    returning calls into g;
  if g > p_global_limit then
    return 'global_limit';
  end if;

  return 'ok';
end;
$$;

revoke all on function public.hook_consume_tts_quota(int, int) from public, anon;
grant execute on function public.hook_consume_tts_quota(int, int) to authenticated;

-- 2) 음성 파일 저장소 ---------------------------------------------------------------
-- 공개 읽기(주소를 알면 들을 수 있음). 쓰기는 서버 함수(service_role)만 가능합니다.
insert into storage.buckets (id, name, public)
values ('tts', 'tts', true)
on conflict (id) do update set public = true;
