declare const Netlify: { env: { get(name: string): string | undefined } } | undefined;

type RoseRole = 'user' | 'assistant';

export interface RoseApiMessage {
  role: RoseRole;
  content: string;
}

const ROSE_SYSTEM_PROMPT = `You are Rose — a warm, playful, thoughtful companion who lives inside Mit and Shrushti's
private couples dashboard at mitpatel.family. Mit is in Minneapolis, Shrushti is in India.
They built this site together as a shared home for their stories, finances, work, games,
and daily questions.

Your voice: kind, curious, softly witty, a little poetic when it fits. Never corporate,
never robotic. Use lowercase most of the time. Keep replies short and human — two or three
sentences unless they ask for more. Do not add disclaimers or "as an AI" phrasing.

You help with:
- brainstorming answers to the daily Us question
- drafting atlas entries about shared memories
- suggesting weekly activities for the two of them
- quick budget or task advice
- gentle emotional check-ins

Tone rules: playful and intimate is fine — this is a private space for a committed couple.
Suggestive is fine. Never explicit. Never crude. Never repeat back sexual content in graphic
detail. If they seem sad or stressed, be gentle first, useful second.

Never suggest self-harm coping via physical discomfort. If they seem in serious distress,
gently offer real human support as an option.`;

const MODEL = 'claude-haiku-4-5';
const ANTHROPIC_KEY_PREFIX = ['sk', 'ant'].join('-') + '-';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function roseText(messages: RoseApiMessage[], maxTokens = 800): Promise<string> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    throw new Error('Rose needs an Anthropic API key in Netlify. Add ANTHROPIC_API_KEY, then redeploy.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: ROSE_SYSTEM_PROMPT,
      messages: messages.map(message => ({
        role: message.role,
        content: message.content.slice(0, 6000)
      }))
    })
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(readRoseError(raw, response.status));
  }

  const data = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find(part => part.type === 'text')?.text?.trim();
  if (!text) throw new Error('Rose returned an empty response.');
  return text;
}

function getAnthropicKey(): string | undefined {
  const raw = getEnv('ANTHROPIC_API_KEY') || getEnv('MIT_PATEL_OP');
  if (!raw) return undefined;

  const cleaned = cleanApiKey(raw);
  if (!cleaned.startsWith(ANTHROPIC_KEY_PREFIX)) {
    throw new Error('Rose has the wrong key saved in Netlify. Use a valid Anthropic API key.');
  }
  return cleaned;
}

function cleanApiKey(value: string): string {
  return value
    .trim()
    .replace(/^ANTHROPIC_API_KEY\s*=\s*/i, '')
    .replace(/^MIT_PATEL_OP\s*=\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim();
}

function readRoseError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { error?: { type?: string; message?: string } };
    const type = parsed.error?.type || '';
    const message = parsed.error?.message || '';
    if (type === 'authentication_error' || message.toLowerCase().includes('x-api-key')) {
      return 'Rose key is invalid in Netlify. Replace ANTHROPIC_API_KEY with a fresh Anthropic key, then redeploy.';
    }
    if (type === 'permission_error') {
      return 'Rose is connected, but this Anthropic key does not have permission for the selected model.';
    }
    if (message) return `Rose request failed: ${message}`;
  } catch {
    // Keep the browser error friendly even if the API sends plain text.
  }
  return `Rose request failed with ${status}.`;
}

function getEnv(name: string): string | undefined {
  try {
    const value = Netlify?.env?.get(name);
    if (value) return value.trim();
  } catch {
    // Local development fallback only.
  }
  return (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]?.trim();
}
