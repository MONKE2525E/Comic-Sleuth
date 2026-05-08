import { NextResponse } from 'next/server';
import {
  SETTING_KEYS,
  DEFAULT_MODEL,
  DEFAULT_PROMPT,
  DEFAULT_CHAT_PROMPT,
  DEFAULT_EBAY_DRAFT_PROMPT,
  DEFAULT_MAX_RETRIES,
  getGeminiModel,
  getGeminiPrompt,
  getChatPrompt,
  getEbayDraftPrompt,
  getEbayToken,
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

function getRawEbayToken(): string {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(SETTING_KEYS.ebayToken) as
    | { value: string }
    | undefined;
  return row?.value || process.env.EBAY_USER_TOKEN || '';
}

export async function GET() {
  try {
    const key = getRawApiKey();
    const masked = key.length > 4 ? '•'.repeat(key.length - 4) + key.slice(-4) : key ? '••••' : '';

    const ebayToken = getRawEbayToken();
    const ebayMasked = ebayToken.length > 4 ? '•'.repeat(ebayToken.length - 4) + ebayToken.slice(-4) : ebayToken ? '••••' : '';

    return NextResponse.json({
      hasKey: !!key,
      masked,
      hasEbayToken: !!ebayToken,
      ebayMasked,
      model: getGeminiModel(),
      prompt: getGeminiPrompt(),
      chatPrompt: getChatPrompt(),
      ebayDraftPrompt: getEbayDraftPrompt(),
      maxRetries: getMaxRetries(),
      defaults: {
        model: DEFAULT_MODEL,
        prompt: DEFAULT_PROMPT,
        chatPrompt: DEFAULT_CHAT_PROMPT,
        ebayDraftPrompt: DEFAULT_EBAY_DRAFT_PROMPT,
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
    const { apiKey, ebayToken, model, prompt, chatPrompt, ebayDraftPrompt, maxRetries } = body as {
      apiKey?: unknown;
      ebayToken?: unknown;
      model?: unknown;
      prompt?: unknown;
      chatPrompt?: unknown;
      ebayDraftPrompt?: unknown;
      maxRetries?: unknown;
    };

    const validatedUpdates: { key: string; value: string }[] = [];

    if (apiKey !== undefined) {
      if (typeof apiKey !== 'string' || !apiKey.trim()) {
        return NextResponse.json({ error: 'API key must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.apiKey, value: apiKey.trim() });
    }

    if (model !== undefined) {
      if (typeof model !== 'string' || !model.trim()) {
        return NextResponse.json({ error: 'Model must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.model, value: model.trim() });
    }

    if (prompt !== undefined) {
      if (typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ error: 'Prompt must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.prompt, value: prompt.trim() });
    }

    if (chatPrompt !== undefined) {
      if (typeof chatPrompt !== 'string' || !chatPrompt.trim()) {
        return NextResponse.json({ error: 'Chat Prompt must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.chatPrompt, value: chatPrompt.trim() });
    }

    if (ebayDraftPrompt !== undefined) {
      if (typeof ebayDraftPrompt !== 'string' || !ebayDraftPrompt.trim()) {
        return NextResponse.json({ error: 'eBay Draft Prompt must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.ebayDraftPrompt, value: ebayDraftPrompt.trim() });
    }

    if (maxRetries !== undefined) {
      const parsed = typeof maxRetries === 'number' ? maxRetries : parseInt(String(maxRetries), 10);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
        return NextResponse.json({ error: 'maxRetries must be an integer between 1 and 10.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.maxRetries, value: String(Math.floor(parsed)) });
    }

    if (ebayToken !== undefined) {
      if (typeof ebayToken !== 'string' || !ebayToken.trim()) {
        return NextResponse.json({ error: 'eBay token must be a non-empty string.' }, { status: 400 });
      }
      validatedUpdates.push({ key: SETTING_KEYS.ebayToken, value: ebayToken.trim() });
    }

    if (validatedUpdates.length > 0) {
      const updateStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
      const transaction = db.transaction((updates: { key: string; value: string }[]) => {
        for (const update of updates) {
          updateStmt.run(update.key, update.value);
        }
      });
      transaction(validatedUpdates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
