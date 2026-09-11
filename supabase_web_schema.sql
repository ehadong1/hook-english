-- Hook English (웹앱, src/App.tsx) 데이터 영구 저장용 스키마
-- Supabase 대시보드 → SQL Editor 에서 이 파일 전체를 실행하세요.
--
-- 인증(로그인) 기능은 아직 없습니다. 대신 브라우저에 저장된 임의의
-- device_id(랜덤 UUID, src/lib/deviceId.ts)를 사용자 식별자로 씁니다.
-- 추측하기 어려운 랜덤 값이라 개인 메모장 수준의 보안은 되지만,
-- 진짜 계정 로그인이 아니므로 민감한 데이터는 넣지 마세요.
-- 나중에 이메일 로그인을 붙이면 device_id 대신 auth.uid() 기반으로
-- RLS 정책을 다시 조여야 합니다 (기획서 P0 항목).

create extension if not exists pgcrypto;

-- 1) 온보딩 서베이 결과 (기기 1개당 1행)
create table if not exists public.hook_profiles (
  device_id text primary key,
  answers jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 저장한 문장 / 단어 + 복습(에빙하우스) 상태
create table if not exists public.hook_items (
  id text primary key,              -- 프론트에서 생성하는 uid() 문자열을 그대로 사용
  device_id text not null references public.hook_profiles(device_id) on delete cascade,
  type text not null check (type in ('word', 'sentence')),
  text text not null,
  meaning text,
  source_id text,
  stage int not null default 0,
  next_review_at timestamptz not null,
  mastered boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_hook_items_device on public.hook_items (device_id);
create index if not exists idx_hook_items_review on public.hook_items (device_id, mastered, next_review_at);

-- 3) 열람한 문장의 문법 이력 ("지난번 사례" 노출용)
create table if not exists public.hook_history (
  id uuid primary key default gen_random_uuid(),
  device_id text not null references public.hook_profiles(device_id) on delete cascade,
  sentence_id text not null,
  text text not null,
  grammar_keys jsonb not null default '[]'::jsonb,
  at timestamptz not null default now(),
  unique (device_id, sentence_id)
);

create index if not exists idx_hook_history_device on public.hook_history (device_id);

-- Row Level Security: 아직 auth가 없으므로 anon 키로 전체 CRUD를 허용합니다.
-- (device_id를 아는 사람만 자기 데이터를 다룬다는 전제의 임시 보안 모델)
alter table public.hook_profiles enable row level security;
alter table public.hook_items enable row level security;
alter table public.hook_history enable row level security;

drop policy if exists "anon full access" on public.hook_profiles;
create policy "anon full access" on public.hook_profiles for all using (true) with check (true);

drop policy if exists "anon full access" on public.hook_items;
create policy "anon full access" on public.hook_items for all using (true) with check (true);

drop policy if exists "anon full access" on public.hook_history;
create policy "anon full access" on public.hook_history for all using (true) with check (true);
