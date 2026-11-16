-- Hook English: 활용 후기 (사용 기록 + 한줄 후기, 운영자 승인 후 공개)
-- Supabase SQL Editor에서 실행하세요. (여러 번 실행해도 안전합니다)
-- 전제: supabase_phrase_bank_v2.sql(관리자 함수 is_hook_admin)이 이미 실행돼 있어야 해요.
create table if not exists public.hook_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nickname text,
  body text not null,
  stats jsonb not null default '{}',          -- 작성 시점의 사용 기록 {saved, days, notes}
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_hook_reviews_status on public.hook_reviews (status, created_at desc);

alter table public.hook_reviews enable row level security;

drop policy if exists "read approved or own or admin" on public.hook_reviews;
create policy "read approved or own or admin" on public.hook_reviews
  for select using (status = 'approved' or user_id = auth.uid() or public.is_hook_admin());

-- 로그인한(익명 아닌) 사용자만, 검토 대기로만, 하루 3개까지, 5~200자
drop policy if exists "users submit reviews" on public.hook_reviews;
create policy "users submit reviews" on public.hook_reviews
  for insert to authenticated
  with check (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and user_id = auth.uid()
    and status = 'pending'
    and char_length(body) between 5 and 200
    and (nickname is null or char_length(nickname) <= 20)
    and (select count(*) from public.hook_reviews r where r.user_id = auth.uid() and r.created_at > now() - interval '1 day') < 3
  );

-- 관리자: 승인/반려
drop policy if exists "admin update reviews" on public.hook_reviews;
create policy "admin update reviews" on public.hook_reviews
  for update to authenticated using (public.is_hook_admin()) with check (public.is_hook_admin());

-- 내 후기는 내가 지울 수 있어요
drop policy if exists "delete own review" on public.hook_reviews;
create policy "delete own review" on public.hook_reviews
  for delete to authenticated using (user_id = auth.uid());
