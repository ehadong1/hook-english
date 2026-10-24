-- Hook English 뉴스 기반 "오늘의 3문장" 스키마
-- 목적: Exa로 오늘자 실제 뉴스/기사를 검색 → GPT로 학습하기 좋은 영어 문장 3개 추출
-- + 2단계 검수 → 저장. src/App.tsx의 SENTENCE_BANK(isNews:true 항목)와 같은 모양이라
-- 프론트엔드가 그대로 재사용할 수 있습니다.
--
-- Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.hook_news_sentences (
  id uuid primary key default gen_random_uuid(),
  topic text not null,              -- TOPIC_TO_BANK의 값 중 하나: "비즈니스/IT 트렌드" | "일상 및 오피스 회화" | "최신 시사 및 뉴스"
  level text not null,               -- "왕초보" | "기초 회화" | "중상급"
  tone text,                         -- "정중한 비즈니스" | "중립 실무" | "캐주얼 친근"
  situations jsonb not null default '[]'::jsonb,
  text text not null,                -- 영어 문장
  translation text not null,         -- 한글 번역
  grammar_keys jsonb not null default '[]'::jsonb,   -- App.tsx GRAMMAR_LIBRARY 키 중에서만
  vocab jsonb not null default '[]'::jsonb,           -- [{word, meaning, note}]
  native_alternatives jsonb not null default '[]'::jsonb, -- [{en, ko, note}]
  source_url text,
  verified_score numeric,
  verified_reason text,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  published_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists idx_hook_news_sentences_topic_status
  on public.hook_news_sentences (topic, status, published_date desc);

alter table public.hook_news_sentences enable row level security;

-- anon(앱 사용자)은 검수 통과(approved)된 것만 읽을 수 있음.
-- 쓰기는 collector 스크립트의 service_role 키로만 가능 (RLS 우회).
drop policy if exists "anon read approved only" on public.hook_news_sentences;
create policy "anon read approved only" on public.hook_news_sentences
  for select using (status = 'approved');
