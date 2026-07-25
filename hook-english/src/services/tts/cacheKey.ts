import * as Crypto from 'expo-crypto';

export function normalizeTtsText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export async function buildTtsCacheKey(text: string, voice: string, model: string): Promise<string> {
  const payload = `${normalizeTtsText(text)}|${voice}|${model}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
}

export function ttsLocalFilename(hash: string): string {
  return `${hash}.mp3`;
}

export function ttsStoragePath(hash: string): string {
  return `tts/${hash}.mp3`;
}
