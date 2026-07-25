import * as FileSystem from 'expo-file-system';
import { ttsLocalFilename } from './cacheKey';

const CACHE_DIR = `${FileSystem.cacheDirectory}hook-english-tts/`;

async function ensureCacheDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  return CACHE_DIR;
}

export async function getLocalTtsUri(hash: string): Promise<string | null> {
  await ensureCacheDir();
  const uri = `${CACHE_DIR}${ttsLocalFilename(hash)}`;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
}

export async function saveLocalTts(hash: string, bytes: Uint8Array): Promise<string> {
  await ensureCacheDir();
  const uri = `${CACHE_DIR}${ttsLocalFilename(hash)}`;
  const base64 = uint8ToBase64(bytes);
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

export async function saveLocalTtsFromUri(hash: string, sourceUri: string): Promise<string> {
  await ensureCacheDir();
  const dest = `${CACHE_DIR}${ttsLocalFilename(hash)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
