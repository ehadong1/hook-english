const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';

export async function synthesizeOpenAiSpeech(
  text: string,
  options: { voice?: string; model?: string; apiKey?: string },
): Promise<Uint8Array> {
  const apiKey = options.apiKey ?? process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('EXPO_PUBLIC_OPENAI_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(OPENAI_TTS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? process.env.EXPO_PUBLIC_TTS_MODEL ?? 'tts-1',
      voice: options.voice ?? process.env.EXPO_PUBLIC_TTS_VOICE ?? 'alloy',
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI TTS 실패 (${response.status}): ${body}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Azure TTS는 엔드포인트·리전 설정 후 동일 캐시 파이프라인에 연결 */
export async function synthesizeAzureSpeech(
  _text: string,
  _options: { voice?: string },
): Promise<Uint8Array> {
  throw new Error('Azure TTS는 EXPO_PUBLIC_AZURE_SPEECH_KEY 설정 후 구현을 연결하세요.');
}
