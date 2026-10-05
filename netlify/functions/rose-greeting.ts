import type { Handler } from '@netlify/functions';
import { ROSE_SYSTEM } from './_rose-personality';

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method not allowed' };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, body: 'rose is unavailable right now' };
  let body: { display?: string; hour?: number; weekday?: string };
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'invalid json' }; }
  if (!body || typeof body.display !== 'string' || typeof body.hour !== 'number' || typeof body.weekday !== 'string') {
    return { statusCode: 400, body: 'display, hour and weekday required' };
  }
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 200, system: ROSE_SYSTEM,
        messages: [{ role: 'user', content: `produce ONE short warm greeting for ${body.display} at hour ${body.hour} on ${body.weekday}. one or two sentences, lowercase, no quotes.` }] })
    });
    if (!resp.ok) return { statusCode: 502, body: 'rose is unavailable right now' };
    const json = await resp.json();
    const text = json.content?.filter((block: { type: string; text?: string }) => block.type === 'text').map((block: { text: string }) => block.text).join('\n') ?? '';
    if (!text.trim()) return { statusCode: 502, body: 'rose did not send a reply' };
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) };
  } catch { return { statusCode: 502, body: 'rose is unavailable right now' }; }
};
