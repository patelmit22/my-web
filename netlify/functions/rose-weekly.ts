import type { Config } from '@netlify/functions';
import { jsonResponse, roseText } from './_shared/rose';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  try {
    const text = await roseText([{
      role: 'user',
      content: 'suggest one sweet, low-pressure weekly activity for Mit in Minneapolis and Shrushti in India. Make it doable long-distance, playful, and under three sentences.'
    }], 220);

    return jsonResponse({ text });
  } catch (error) {
    console.error('Rose weekly failed', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Rose weekly idea unavailable.' }, 500);
  }
};

export const config: Config = {
  method: ['POST']
};
