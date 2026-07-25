import { Audio } from 'expo-av';
import type { PlaySpeechOptions, PlaySpeechResult } from '../../types';
import { buildTtsCacheKey, normalizeTtsText } from './cacheKey';
import { getLocalTtsUri, saveLocalTts } from './localTtsCache';
import { fetchRemoteTtsPublicUrl, uploadTtsToSupabase } from './supabaseTtsCache';
import { synthesizeOpenAiSpeech } from './openaiTts';

let currentSound: Audio.Sound | null = null;

async function playUri(
  uri: string,
  callbacks: Pick<PlaySpeechOptions, 'onStart' | 'onEnd' | 'onError'>,
): Promise<void> {
  await stopSpeech();

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true },
    (status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        callbacks.onEnd?.();
      }
    },
  );

  currentSound = sound;
  callbacks.onStart?.();
}

export async function stopSpeech(): Promise<void> {
  if (!currentSound) return;
  try {
    await currentSound.stopAsync();
    await currentSound.unloadAsync();
  } finally {
    currentSound = null;
  }
}

/**
 * TTS 재생 파이프라인 (비용 방어):
 * 1) 로컬 MP3 캐시 → 2) Supabase Storage/메타 → 3) OpenAI TTS 생성 후 로컬+Supabase 저장
 */
export async function playCachedSpeech(options: PlaySpeechOptions): Promise<PlaySpeechResult> {
  const text = normalizeTtsText(options.text);
  if (!text) throw new Error('재생할 텍스트가 비어 있습니다.');

  const voice = options.voice ?? process.env.EXPO_PUBLIC_TTS_VOICE ?? 'alloy';
  const model = options.model ?? process.env.EXPO_PUBLIC_TTS_MODEL ?? 'tts-1';
  const hash = await buildTtsCacheKey(text, voice, model);

  const localUri = await getLocalTtsUri(hash);
  if (localUri) {
    await playUri(localUri, options);
    return { source: 'local', uri: localUri };
  }

  const remoteUrl = await fetchRemoteTtsPublicUrl(hash);
  if (remoteUrl) {
    const downloaded = await saveLocalTts(hash, await fetchBytes(remoteUrl));
    await playUri(downloaded, options);
    return { source: 'remote', uri: downloaded };
  }

  const mp3 = await synthesizeOpenAiSpeech(text, { voice, model });
  const savedUri = await saveLocalTts(hash, mp3);
  await uploadTtsToSupabase(hash, mp3, { voice, model, text });
  await playUri(savedUri, options);
  return { source: 'generated', uri: savedUri };
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`원격 TTS 다운로드 실패 (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}
