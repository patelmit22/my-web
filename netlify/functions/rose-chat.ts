import type { Config } from '@netlify/functions';
import { jsonResponse, roseText, type RoseApiMessage } from './_shared/rose';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json() as { messages?: RoseApiMessage[]; page?: string };
    const messages = (body.messages || [])
      .filter(message => (message.role === 'user' || message.role === 'assistant') && message.content?.trim())
      .slice(-12);

    if (!messages.length) return jsonResponse({ error: 'message is required' }, 400);

    const pageNote = body.page ? `current page: ${body.page}` : 'current page: dashboard';
    const text = await roseText([
      { role: 'user', content: `use this page context quietly: ${pageNote}` },
      ...messages
    ]);

    return jsonResponse({ text });
  } catch (error) {
    console.error('Rose chat failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Rose is unavailable right now.' }, 500);
  }
};

export const config: Config = {
  method: ['POST']
};
