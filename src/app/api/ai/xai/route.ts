import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RequestBody = { apiKey?: string; model?: string; prompt?: string; temperature?: number; max_tokens?: number; messages?: Array<{ role?: string; content?: string }> };

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const apiKey = (request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || body.apiKey)?.trim();
  const model = body.model?.trim() || 'grok-4.7';
  const messages = body.messages?.filter(message => ['system', 'user', 'assistant'].includes(message.role || '') && typeof message.content === 'string') || (body.prompt?.trim() ? [{ role: 'user', content: body.prompt.trim() }] : []);
  if (!apiKey || !messages.length) {
    return NextResponse.json({ error: 'Enter your xAI API key and try again.' }, { status: 400 });
  }
  if (apiKey.length > 512 || !messages.length || messages.some(message => message.content!.length > 30_000) || !/^[a-zA-Z0-9._-]+$/.test(model)) {
    return NextResponse.json({ error: 'The API key, model, or prompt is invalid or too long.' }, { status: 400 });
  }

  try {
    const upstream = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.25, max_tokens: 900, messages }),
      signal: AbortSignal.timeout(45_000),
      cache: 'no-store',
    });
    const result = await upstream.json().catch(() => null) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    } | null;

    if (!upstream.ok) {
      const detail = result?.error?.message || `xAI returned HTTP ${upstream.status}.`;
      const guidance = upstream.status === 401 || upstream.status === 403
        ? ' Check that the API key is valid and has access to this model.'
        : upstream.status === 404
          ? ' Check that the model ID is available to your xAI account.'
          : upstream.status === 429
            ? ' The account rate limit or credit balance may have been reached.'
            : upstream.status >= 500
              ? ' xAI may be temporarily unavailable; try again shortly.'
              : '';
      return NextResponse.json({ error: `${detail}${guidance}` }, { status: upstream.status >= 500 ? 502 : upstream.status });
    }

    const content = result?.choices?.[0]?.message?.content;
    const text = (typeof content === 'string' ? content : content?.map(part => part.text || '').join('\n'))?.trim();
    if (!text) return NextResponse.json({ error: 'Grok returned no text. Try again or choose another model.' }, { status: 502 });
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'Grok took too long to respond. Please try again.'
      : 'Could not connect to xAI. Check your connection and try again.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
