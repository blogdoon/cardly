import { GoogleGenAI } from '@google/genai';

// ponytail: the key is inlined into the public bundle at build time — anyone can
// read it from devtools and spend your quota. Move this call behind a Cloud
// Function before real payments land.
const API_KEY: string = import.meta.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';

export const isAiMessageAvailable = Boolean(API_KEY);

const TONE_HINT: Record<string, string> = {
  Humorous: 'witty and playful, with one laugh-worthy line',
  Heartfelt: 'warm and sincere, personal and touching',
  Cheeky: 'playfully teasing but clearly affectionate',
  Sweet: 'gentle, warm and thoughtful',
  Formal: 'polished and gracious',
  Playful: 'light-hearted and fun',
};

export interface CardMessageContext {
  recipient?: string;
  occasion?: string;
  tone?: string;
  milestoneAge?: number;
}

/**
 * Generates the inside-greeting copy for a card. Throws if unconfigured or the
 * model returns nothing; callers surface the message to the user.
 */
export async function generateCardMessage(ctx: CardMessageContext): Promise<string> {
  if (!API_KEY) throw new Error('AI writing is not configured on this build.');

  const prompt = [
    'Write the inside message for a greeting card.',
    ctx.occasion ? `Occasion: ${ctx.occasion}.` : '',
    ctx.recipient ? `It is for ${ctx.recipient}.` : '',
    ctx.milestoneAge ? `They are turning ${ctx.milestoneAge}.` : '',
    `Tone: ${TONE_HINT[ctx.tone || ''] || ctx.tone || 'warm and sincere'}.`,
    'Rules: 2 to 4 short sentences, under 380 characters total. No emoji, no hashtags, ' +
      'no markdown. Do not open with a generic "wishing you a very happy birthday" line. ' +
      'End with a sign-off such as "x" or "With all my love". Return only the message text.',
  ]
    .filter(Boolean)
    .join(' ');

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const res = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const text = (res.text || '').trim().replace(/^["'`]|["'`]$/g, '');

  if (!text) throw new Error('The AI returned an empty message. Please try again.');
  return text;
}
