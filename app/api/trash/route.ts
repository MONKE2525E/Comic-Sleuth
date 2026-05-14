import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const items = db.prepare(`SELECT * FROM deleted_listings ORDER BY deletedAt DESC`).all();
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch trash: " + error.message }, { status: 500 });
  }
}
