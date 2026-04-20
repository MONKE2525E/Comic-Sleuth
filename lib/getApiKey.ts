import db from './db';

export function getGeminiApiKey(): string {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('gemini_api_key') as { value: string } | undefined;
    return row?.value || process.env.GEMINI_API_KEY || '';
  } catch {
    return process.env.GEMINI_API_KEY || '';
  }
}
