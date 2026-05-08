import db from './db';
import { COMIC_ANALYSIS_PROMPT, COMIC_CHAT_PROMPT, COMIC_EBAY_DRAFT_PROMPT } from './geminiPrompt';

export const DEFAULT_MODEL = 'gemini-3.1-pro-preview';
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_PROMPT = COMIC_ANALYSIS_PROMPT;
export const DEFAULT_CHAT_PROMPT = COMIC_CHAT_PROMPT;
export const DEFAULT_EBAY_DRAFT_PROMPT = COMIC_EBAY_DRAFT_PROMPT;

export const SETTING_KEYS = {
  apiKey: 'gemini_api_key',
  model: 'gemini_model',
  prompt: 'gemini_prompt',
  chatPrompt: 'gemini_chat_prompt',
  ebayDraftPrompt: 'gemini_ebay_draft_prompt',
  maxRetries: 'gemini_max_retries',
  ebayToken: 'ebay_user_token',
} as const;

function getSetting(key: string): string | null {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    const value = row?.value;
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

export function getGeminiApiKey(): string {
  return getSetting(SETTING_KEYS.apiKey) || process.env.GEMINI_API_KEY || '';
}

export function getEbayToken(): string {
  return getSetting(SETTING_KEYS.ebayToken) || process.env.EBAY_USER_TOKEN || '';
}

export function getGeminiModel(): string {
  return getSetting(SETTING_KEYS.model) || DEFAULT_MODEL;
}

export function getGeminiPrompt(): string {
  return getSetting(SETTING_KEYS.prompt) || DEFAULT_PROMPT;
}

export function getChatPrompt(): string {
  return getSetting(SETTING_KEYS.chatPrompt) || DEFAULT_CHAT_PROMPT;
}

export function getEbayDraftPrompt(): string {
  return getSetting(SETTING_KEYS.ebayDraftPrompt) || DEFAULT_EBAY_DRAFT_PROMPT;
}

export function getMaxRetries(): number {
  const raw = getSetting(SETTING_KEYS.maxRetries);
  if (!raw) return DEFAULT_MAX_RETRIES;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_RETRIES;
}
