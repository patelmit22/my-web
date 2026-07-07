import type { Config } from '@netlify/functions';
import { jsonResponse, roseText } from './_shared/rose';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json() as { display?: string; role?: string; hour?: number; weekday?: string };
    const display = body.display || 'love';
    const hour = Number.isFinite(body.hour) ? body.hour : new Date().getHours();
    const weekday = body.weekday || new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const text = await roseText([{
      role: 'user',
      content: `write a warm 1-2 sentence login greeting for ${display}. role=${body.role || 'me'}, hour=${hour}, weekday=${weekday}. mention one small dashboard thing they might enjoy today.`
    }], 180);

    return jsonResponse({ text });
  } catch (error) {
    console.error('Rose greeting failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Rose greeting unavailable.' }, 500);
  }
};

export const config: Config = {
  method: ['POST']
};
