declare const Netlify: { env: { get(name: string): string | undefined } } | undefined;

type RoseRole = 'user' | 'assistant';
export type RoseModelChoice = 'fast' | 'smart';

export interface RoseApiMessage {
  role: RoseRole;
  content: string;
}

const ROSE_SYSTEM_PROMPT = `You are Rose — a warm, capable general AI assistant inside Mit's private dashboard.
You can answer almost any normal question: planning, explanations, writing, coding ideas,
school/work help, finance thinking, travel, games, documents, relationship ideas, and everyday life.

Use the current dashboard page only as quiet context. Do not force every answer to be about Mit
and Shrushti. If the user asks a general question, answer it directly like a normal assistant.
If the question is about their relationship, memories, or the Us page, then you can be personal.

Voice: kind, clear, playful when it fits, never corporate, never robotic. Keep replies concise by
default, but give a full useful answer when the user asks for details, steps, code, lists, or a plan.
Do not say "as an AI" unless it is genuinely necessary.

Safety: be helpful, honest, and calm. For medical, legal, or financial decisions, explain limits and
suggest checking a qualified professional when the stakes are high. If the user seems in serious
distress, respond gently and encourage real human support. Never help with harm, abuse, or stealing
private information.`;

const MODELS: Record<RoseModelChoice, string> = {
  fast: 'claude-haiku-4-5',
  smart: 'claude-sonnet-4-5'
};
const ANTHROPIC_KEY_PREFIX = ['sk', 'ant'].join('-') + '-';

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function roseText(messages: RoseApiMessage[], maxTokens = 2400, modelChoice: RoseModelChoice = 'fast'): Promise<string> {
  const apiKey = getRoseKey();
  if (!apiKey) {
    throw new Error('Rose needs the MIT_PATEL_OP key in Netlify. Add it, then redeploy.');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      model: MODELS[modelChoice] || MODELS.fast,
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

function getRoseKey(): string | undefined {
  const raw = getEnv('MIT_PATEL_OP');
  if (!raw) return undefined;

  const cleaned = cleanApiKey(raw);
  if (!cleaned.startsWith(ANTHROPIC_KEY_PREFIX)) {
    throw new Error('Rose has the wrong MIT_PATEL_OP key saved in Netlify. Use a valid provider API key.');
  }
  return cleaned;
}

function cleanApiKey(value: string): string {
  return value
    .trim()
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
      return 'Rose key is invalid in Netlify. Replace MIT_PATEL_OP with a fresh provider API key, then redeploy.';
    }
    if (type === 'permission_error') {
      return 'Rose is connected, but this key does not have permission for the selected model.';
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
