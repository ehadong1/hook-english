import { isSupabaseConfigured, supabase, TTS_BUCKET } from '../../lib/supabase';
import { ttsStoragePath } from './cacheKey';

export async function fetchRemoteTtsPublicUrl(hash: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('tts_audio_cache')
    .select('public_url, storage_path')
    .eq('text_hash', hash)
    .maybeSingle();

  if (error || !data) return null;
  if (data.public_url) return data.public_url;

  if (data.storage_path) {
    const { data: signed } = await supabase.storage
      .from(TTS_BUCKET)
      .createSignedUrl(data.storage_path, 60 * 60);
    return signed?.signedUrl ?? null;
  }

  return null;
}

export async function uploadTtsToSupabase(
  hash: string,
  bytes: Uint8Array,
  meta: { voice: string; model: string; text: string },
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const path = ttsStoragePath(hash);
  const { error: uploadError } = await supabase.storage
    .from(TTS_BUCKET)
    .upload(path, bytes, { contentType: 'audio/mpeg', upsert: true });

  if (uploadError) return null;

  const { data: publicData } = supabase.storage.from(TTS_BUCKET).getPublicUrl(path);
  const publicUrl = publicData.publicUrl;

  await supabase.from('tts_audio_cache').upsert(
    {
      text_hash: hash,
      voice: meta.voice,
      model: meta.model,
      source_text: meta.text,
      storage_path: path,
      public_url: publicUrl,
    },
    { onConflict: 'text_hash' },
  );

  return publicUrl;
}
