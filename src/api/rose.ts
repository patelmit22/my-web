import type { PageId, RoseMessage, RoseModelChoice, UserRole } from '../types/models';

interface RoseResponse {
  text?: string;
  error?: string;
}

export async function roseChat(messages: RoseMessage[], page: PageId, model: RoseModelChoice): Promise<string> {
  return postRose('/.netlify/functions/rose-chat', { messages, page, model });
}

export async function roseGreeting(display: string, role: UserRole): Promise<string> {
  const now = new Date();
  return postRose('/.netlify/functions/rose-greeting', {
    display,
    role,
    hour: now.getHours(),
    weekday: now.toLocaleDateString('en-US', { weekday: 'long' })
  });
}

export async function roseWeekly(): Promise<string> {
  return postRose('/.netlify/functions/rose-weekly', {});
}

async function postRose(url: string, body: unknown): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({})) as RoseResponse;
  if (!response.ok) throw new Error(data.error || 'rose is unavailable right now');
  if (!data.text) throw new Error('rose did not send a reply');
  return data.text;
}
