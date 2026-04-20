import { NextResponse } from 'next/server';
import {
  SETTING_KEYS,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_MAX_RETRIES,
  getGeminiModel,
  getGeminiPrompt,
  getMaxRetries,
  setSetting,
} from '@/lib/settings';
import db from '@/lib/db';

function getRawApiKey(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(SETTING_KEYS.apiKey) as
    | { value: string }
    | undefined;
  return row?.value || process.env.GEMINI_API_KEY || '';
}

export async function GET() {
  try {
    const key = getRawApiKey();
    const masked = key.length > 4 ? '•'.repeat(key.length - 4) + key.slice(-4) : key ? '••••' : '';
    return NextResponse.json({
      hasKey: !!key,
      masked,
      model: getGeminiModel(),
      prompt: getGeminiPrompt(),
      maxRetries: getMaxRetries(),
      defaults: {
        model: DEFAULT_MODEL,
        prompt: DEFAULT_PROMPT,
        maxRetries: DEFAULT_MAX_RETRIES,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load settings: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, model, prompt, maxRetries } = body as {
      apiKey?: unknown;
      model?: unknown;
      prompt?: unknown;
      maxRetries?: unknown;
    };

    if (apiKey !== undefined) {
      if (typeof apiKey !== 'string' || !apiKey.trim()) {
        return NextResponse.json({ error: 'API key must be a non-empty string.' }, { status: 400 });
      }
      setSetting(SETTING_KEYS.apiKey, apiKey.trim());
    }

    if (model !== undefined) {
      if (typeof model !== 'string' || !model.trim()) {
        return NextResponse.json({ error: 'Model must be a non-empty string.' }, { status: 400 });
      }
      setSetting(SETTING_KEYS.model, model.trim());
    }

    if (prompt !== undefined) {
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ error: 'Prompt must be a non-empty string.' }, { status: 400 });
      }
      setSetting(SETTING_KEYS.prompt, prompt.trim());
    }

    if (maxRetries !== undefined) {
      const parsed = typeof maxRetries === 'number' ? maxRetries : parseInt(String(maxRetries), 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
        return NextResponse.json({ error: 'maxRetries must be an integer between 1 and 10.' }, { status: 400 });
      }
      setSetting(SETTING_KEYS.maxRetries, String(Math.floor(parsed)));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
