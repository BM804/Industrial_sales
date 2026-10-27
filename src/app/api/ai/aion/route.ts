import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type AionRequest = {
  model?: string;
  prompt?: string;
};

type AionResponse = {
  error?: { message?: string; type?: string };
  choices?: Array<{ message?: { content?: string | null } }>;
};

export async function POST(request: Request) {
  let body: AionRequest;
  try {
    body = await request.json() as AionRequest;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const apiKey = process.env.AION_API_KEY?.trim();
  const model = body.model?.trim() || 'aion-labs/aion-3.5-mini';
  const prompt = body.prompt?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Aion Labs is not configured on the server. Add AION_API_KEY to .env.local and restart the app.' }, { status: 503 });
  }
  if (!prompt) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 });
  }
  if (prompt.length > 30_000 || model.length > 128 || !/^[a-zA-Z0-9._/-]+$/.test(model)) {
    return NextResponse.json({ error: 'The model or prompt is too long or contains unsupported characters.' }, { status: 400 });
  }

  const requestBody = JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }],
    reasoning_effort: 'low',
    max_tokens: 1800,
    temperature: 0.2,
  });

  try {
    let upstream: Response | undefined;
    let result: AionResponse | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        upstream = await fetch('https://api.aionlabs.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: requestBody,
          signal: AbortSignal.timeout(25_000),
          cache: 'no-store',
        });
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 700 * (2 ** attempt)));
        continue;
      }

      result = await upstream.json().catch(() => null) as AionResponse | null;
      const retryable = [408, 429, 500, 502, 503, 504].includes(upstream.status);
      if (upstream.ok || !retryable || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 700 * (2 ** attempt)));
    }

    if (!upstream) {
      return NextResponse.json({ error: 'Could not connect to Aion Labs. Please try again.' }, { status: 502 });
    }
    if (!upstream.ok) {
      const detail = result?.error?.message || `Aion Labs returned HTTP ${upstream.status}.`;
      const guidance = upstream.status === 401 || upstream.status === 403
        ? ' Check that the Aion Labs key is active and has API access.'
        : upstream.status === 429
          ? ' The Aion Labs account rate or usage limit was reached; check its dashboard.'
          : upstream.status >= 500
            ? ' Aion Labs is temporarily unavailable; try again shortly.'
            : '';
      return NextResponse.json({ error: `${detail}${guidance}` }, { status: upstream.status >= 500 ? 502 : upstream.status });
    }

    const text = result?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: 'Aion Labs returned no text. Try again or choose a different model.' }, { status: 502 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Aion Labs did not respond in time. Please try again.'
      : 'Could not connect to Aion Labs. Check your internet connection and try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
