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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function roseText(messages: RoseApiMessage[], maxTokens = 800): Promise<string> {
  const apiKey = getEnv('ANTHROPIC_API_KEY');
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in Netlify environment variables.');
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
    throw new Error(raw || `Rose request failed with ${response.status}`);
  }

  const data = JSON.parse(raw) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find(part => part.type === 'text')?.text?.trim();
  if (!text) throw new Error('Rose returned an empty response.');
  return text;
}

function getEnv(name: string): string | undefined {
  try {
    const value = Netlify?.env?.get(name);
    if (value) return value;
  } catch {
    // Local development fallback only.
  }
  return (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}
