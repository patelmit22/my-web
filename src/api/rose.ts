export interface RoseMessage { role: 'user' | 'assistant'; content: string; }
export type RoseModel = 'haiku' | 'sonnet';

export async function roseChat(messages: RoseMessage[], model: RoseModel = 'haiku'): Promise<string> {
  const resp = await fetch('/.netlify/functions/rose-chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return (await resp.json()).text as string;
}

export async function roseGreeting(display: string, hour: number, weekday: string): Promise<string> {
  const resp = await fetch('/.netlify/functions/rose-greeting', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display, hour, weekday })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return (await resp.json()).text as string;
}

export async function roseWeekly(): Promise<string> {
  const resp = await fetch('/.netlify/functions/rose-weekly', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!resp.ok) throw new Error(await resp.text());
  return (await resp.json()).text as string;
}
