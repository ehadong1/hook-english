-- Hook English V2: TTS audio cache (Supabase)
create table if not exists public.tts_audio_cache (
  text_hash text primary key,
  voice text not null,
  model text not null,
  source_text text not null,
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

-- V2 #4: phrase semantic cache (placeholder for next sprint)
create table if not exists public.global_phrase_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_ko text not null,
  normalized_ko_hash text not null unique,
  formal_en text not null,
  casual_en text not null,
  grammar_tip text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_phrase_cache_hash on public.global_phrase_cache (normalized_ko_hash);

-- Storage bucket: tts-audio-cache (public or signed URL policy)
