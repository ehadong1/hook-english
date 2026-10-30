import { supabase } from "./supabaseClient";
import { setNeuralTTSProvider } from "./speech";

/* ============================================================================
   AI 원어민 음성 연결
   - 서버(tts Edge Function)가 문장을 mp3로 만들어 주소를 돌려줍니다.
   - 실패하면 예외를 던져서, speech.ts 가 기기 기본 음성으로 자동 대체합니다.
   - 연속으로 실패하면 5분 동안은 서버를 부르지 않고 바로 기기 음성을 씁니다.
   ============================================================================ */

const urlCache = new Map<string, string>();
let failures = 0;
let pausedUntil = 0;

export function installCloudTTS() {
  if (!supabase) return;
  const client = supabase;

  setNeuralTTSProvider(async (rawText: string) => {
    const text = rawText.replace(/\s+/g, " ").trim().slice(0, 300);
    const hit = urlCache.get(text);
    if (hit) return hit;
    if (Date.now() < pausedUntil) throw new Error("cloud tts paused");

    const { data, error } = await client.functions.invoke("tts", { body: { text } });
    if (error || !data?.url) {
      failures += 1;
      if (failures >= 2) { pausedUntil = Date.now() + 5 * 60 * 1000; failures = 0; }
      throw new Error("cloud tts failed");
    }
    failures = 0;
    urlCache.set(text, data.url as string);
    return data.url as string;
  });
}
