-- Hook English 표현 뱅크(phrase bank) 스키마
-- 목적: Exa로 수집한 실제 원어민 비즈니스 영어 예문을 GPT로 1차 검수한 뒤 저장.
-- 나중에 translate / writing-feedback Edge Function이 GPT 호출 전에 이 테이블에서
-- 비슷한 검증 사례를 몇 개 가져와 few-shot 예시로 넣어주는 RAG 용도로 씁니다.
--
-- Supabase 대시보드 → SQL Editor에서 이 파일 전체를 실행하세요.

create extension if not exists pgcrypto;

create table if not exists public.hook_phrase_bank (
  id uuid primary key default gen_random_uuid(),
  grammar_key text not null,              -- App.tsx의 GRAMMAR_LIBRARY 키와 동일한 값만 사용
  english text not null,                  -- 실제 예문
  korean_meaning text not null,           -- 한글 뜻
  tone text,                              -- formal / neutral / casual
  situation text,                         -- 예: "이메일 및 문서", "화상회의" 등 자유 텍스트 태그
  note text,                              -- 이 표현을 쓰는 맥락 짧은 설명 (한글)
  source_url text,                        -- Exa가 찾아준 원문 출처 (검증/추적용)
  verified_score numeric,                 -- GPT 검수 점수 (1~5), 루브릭 기반
  verified_reason text,                   -- GPT가 이 점수를 준 이유 (한글, 짧게)
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_hook_phrase_bank_grammar_key on public.hook_phrase_bank (grammar_key);
create index if not exists idx_hook_phrase_bank_status on public.hook_phrase_bank (status);

-- RLS: 이 테이블은 앱 사용자가 직접 쓰는 게 아니라 수집 스크립트 + Edge Function만
-- 접근합니다. anon 키로는 읽기만 허용하고(검증된 항목만), 쓰기는 service_role로만 합니다.
alter table public.hook_phrase_bank enable row level security;

drop policy if exists "anon read approved only" on public.hook_phrase_bank;
create policy "anon read approved only" on public.hook_phrase_bank
  for select using (status = 'approved');

-- insert/update/delete는 별도 정책을 만들지 않습니다 → anon 키로는 불가능하고,
-- 수집 스크립트가 쓰는 service_role 키(모든 RLS 우회)로만 가능합니다.
