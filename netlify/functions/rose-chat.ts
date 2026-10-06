import type { Handler } from '@netlify/functions';
import { ROSE_SYSTEM } from './_rose-personality';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface RequestBody {
  messages: ChatMessage[];
  model?: 'haiku' | 'sonnet';
  systemOverride?: string;
  maxTokens?: number;
}

const DEFAULT_MAX = 2400;

export const handler: Handler = async event => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method not allowed' };
  if (!process.env.ANTHROPIC_API_KEY) return { statusCode: 500, body: 'rose is unavailable right now' };

  let body: RequestBody;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'invalid json' }; }
  if (!body || !Array.isArray(body.messages) || !body.messages.length) {
    return { statusCode: 400, body: 'messages array required' };
  }

  if (body.messages.length > 200 || body.messages.some(message => !message ||
      (message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string' ||
      !message.content.trim() || message.content.length > 50000)) {
    return { statusCode: 400, body: 'invalid messages' };
  }

  const model = body.model === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5';
  const system = body.systemOverride || ROSE_SYSTEM;
  const max_tokens = Number.isInteger(body.maxTokens) && body.maxTokens! > 0 ? Math.min(body.maxTokens!, 8192) : DEFAULT_MAX;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system, messages: body.messages })
    });

    if (!resp.ok) {
      return { statusCode: 502, body: 'rose is unavailable right now' };
    }

    const json = await resp.json();
    const text = json.content?.filter((block: { type: string; text?: string }) => block.type === 'text').map((block: { text: string }) => block.text).join('\n') ?? '';
    if (!text.trim()) return { statusCode: 502, body: 'rose did not send a reply' };
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text })
    };
  } catch { return { statusCode: 502, body: 'rose is unavailable right now' }; }
};
