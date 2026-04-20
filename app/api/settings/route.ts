import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('gemini_api_key') as { value: string } | undefined;
    const key = row?.value || process.env.GEMINI_API_KEY || '';
    const masked = key.length > 4 ? '•'.repeat(key.length - 4) + key.slice(-4) : key ? '••••' : '';
    return NextResponse.json({ hasKey: !!key, masked });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load settings: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'API key is required.' }, { status: 400 });
    }
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('gemini_api_key', apiKey.trim());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
