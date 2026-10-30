// Supabase Edge Function: AI 원어민 음성 (OpenAI TTS)
//
// 문장 하나를 자연스러운 원어민 음성(mp3)으로 만들어 Supabase Storage('tts' 버킷)에 저장하고
// 그 주소를 돌려줍니다. 같은 문장은 한 번만 만들고 모든 사용자가 다시 씁니다.
//  - 이미 만들어 둔 문장: 한도에 세지 않고 바로 주소만 반환 (무료)
//  - 새로 만드는 문장: 로그인 사용자별/전체 하루 한도(TTS_*)에 세고 OpenAI를 호출
// OPENAI_API_KEY는 서버 안에만 있습니다.
//
// 사전 준비: supabase_tts_migration.sql 을 SQL Editor에서 실행(한도 함수 + 저장소 생성)
// 배포: supabase functions deploy tts --project-ref <PROJECT_ID>
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  authenticate,
  consumeQuota,
  corsFor,
  json,
  TTS_GLOBAL_DAILY_LIMIT,
  TTS_USER_DAILY_LIMIT,
} from "../_shared/guard.ts";

const BUCKET = "tts";
const MAX_TEXT = 300;
const PRIMARY_MODEL = "gpt-4o-mini-tts"; // 말투 지시(instructions)가 되는 더 자연스러운 모델
const FALLBACK_MODEL = "tts-1"; // 위 모델이 실패하면 쓰는 기본 모델
const VOICE = "alloy";
const INSTRUCTIONS =
  "Speak as a friendly native American English speaker in a professional workplace. " +
  "Natural, relaxed pace with clear pronunciation, natural intonation and linking between words. Not robotic.";

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function speech(apiKey: string, model: string, input: string) {
  const body: Record<string, unknown> = { model, voice: VOICE, input, response_format: "mp3" };
  if (model === PRIMARY_MODEL) body.instructions = INSTRUCTIONS;
  return await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = await authenticate(req, corsHeaders);
    if (auth instanceof Response) return auth;

    const body = await req.json();
    const text = String(body?.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) return json({ error: "읽을 문장이 필요합니다." }, 400, corsHeaders);
    if (text.length > MAX_TEXT) return json({ error: `${MAX_TEXT}자 이내의 문장만 읽을 수 있어요.` }, 400, corsHeaders);

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!serviceKey) return json({ error: "서버에 SUPABASE_SERVICE_ROLE_KEY가 없습니다." }, 500, corsHeaders);
    if (!apiKey) return json({ error: "서버에 OPENAI_API_KEY 시크릿이 설정되어 있지 않습니다." }, 500, corsHeaders);

    const admin = createClient(url, serviceKey);
    const path = `${await sha256Hex(`${PRIMARY_MODEL}|${VOICE}|${text}`)}.mp3`;
    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // 1) 이미 만들어 둔 음성이면 한도에 세지 않고 바로 반환
    const head = await fetch(publicUrl, { method: "HEAD" });
    if (head.ok) return json({ url: publicUrl, cached: true }, 200, corsHeaders);

    // 2) 새로 만들기 전에 하루 한도 확인
    const blocked = await consumeQuota(auth.client, "hook_consume_tts_quota", TTS_USER_DAILY_LIMIT, TTS_GLOBAL_DAILY_LIMIT, corsHeaders);
    if (blocked) return blocked;

    let res = await speech(apiKey, PRIMARY_MODEL, text);
    if (!res.ok) {
      console.error("[tts] 기본 모델 실패, tts-1로 재시도:", res.status, await res.text());
      res = await speech(apiKey, FALLBACK_MODEL, text);
    }
    if (!res.ok) {
      console.error("[tts] OpenAI 오류:", res.status, await res.text());
      return json({ error: "음성 생성에 실패했어요." }, 502, corsHeaders);
    }

    const audio = new Uint8Array(await res.arrayBuffer());
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, audio, {
      contentType: "audio/mpeg",
      upsert: true,
      cacheControl: "31536000",
    });
    if (upErr) {
      console.error("[tts] 저장 실패:", upErr);
      return json({ error: "음성 저장에 실패했어요." }, 500, corsHeaders);
    }

    return json({ url: publicUrl, cached: false }, 200, corsHeaders);
  } catch (err) {
    console.error("[tts] 오류:", err);
    return json({ error: String(err) }, 500, corsHeaders);
  }
});
