import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type GeminiRequest = {
  model?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  let body: GeminiRequest;
  try {
    body = await request.json() as GeminiRequest;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = body.model?.trim() || 'gemini-3.8-flash';
  const prompt = body.prompt?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Gemini is not configured on the server. Add GEMINI_API_KEY to the app environment and restart or redeploy it.' }, { status: 503 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
    return NextResponse.json({ error: 'Model name contains unsupported characters.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 650 },
      }),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });
    const result = await upstream.json().catch(() => null) as {
      error?: { message?: string; status?: string };
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    } | null;

    if (!upstream.ok) {
      const detail = result?.error?.message || `Google returned HTTP ${upstream.status}.`;
      const guidance = upstream.status === 400
        ? ' Check that the model name is available to your API key.'
        : upstream.status === 401 || upstream.status === 403
          ? ' Check that this is a valid Gemini API key from Google AI Studio and that it is enabled for the Gemini API.'
          : upstream.status === 404
            ? ' The model was not found or is not enabled for this key; choose a model available in Google AI Studio.'
            : upstream.status === 429
              ? ' The free-tier quota or rate limit may have been reached; wait and try again later.'
              : upstream.status >= 500
                ? ' Google’s service is temporarily unavailable; try again shortly.'
                : '';
      return NextResponse.json({ error: `${detail}${guidance}` }, { status: upstream.status >= 500 ? 502 : upstream.status });
    }

    const text = result?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim();
    if (!text) {
      return NextResponse.json({ error: `Gemini returned no text${result?.candidates?.[0]?.finishReason ? ` (finish reason: ${result.candidates[0].finishReason})` : ''}. Try again or change the prompt.` }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Gemini took too long to respond. Please try again.'
      : 'Could not connect to Google Gemini. Check your connection and try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
