-- Hook English: 복습 알림(웹 푸시) 구독 정보
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요. (한 번만)
-- 브라우저가 발급한 "알림 주소"를 계정(user_id)별로 저장합니다. 익명 사용자도 저장할 수 있어요.

create table if not exists public.hook_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_hook_push_user on public.hook_push_subscriptions (user_id);

alter table public.hook_push_subscriptions enable row level security;

-- 로그인한(익명 포함) 사용자는 "자기 알림 주소"만 넣고, 보고, 고치고, 지울 수 있습니다.
drop policy if exists "own push select" on public.hook_push_subscriptions;
create policy "own push select" on public.hook_push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own push insert" on public.hook_push_subscriptions;
create policy "own push insert" on public.hook_push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own push update" on public.hook_push_subscriptions;
create policy "own push update" on public.hook_push_subscriptions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own push delete" on public.hook_push_subscriptions;
create policy "own push delete" on public.hook_push_subscriptions
  for delete to authenticated using (user_id = auth.uid());
