import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { saveImage } from '@/lib/imageUtils';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      title, issueNumber, publisher, year,
      gradeEstimate, gradingNotes, valueEstimate,
      keyFeatures, suggestedSKU, ebayDescription,
      frontImage, backImage,
    } = data;

    const frontImagePath = frontImage ? await saveImage(frontImage, 'front') : null;
    const backImagePath = backImage ? await saveImage(backImage, 'back') : null;

    const result = db.prepare(`
      INSERT INTO listings (
        title, issueNumber, publisher, year, gradeEstimate, gradingNotes,
        valueEstimate, keyFeatures, suggestedSKU, ebayDescription,
        frontImage, backImage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, issueNumber?.toString(), publisher, year?.toString(),
      gradeEstimate?.toString(), gradingNotes, valueEstimate,
      keyFeatures, suggestedSKU, ebayDescription,
      frontImagePath?.compressed ?? null, backImagePath?.compressed ?? null
    );

    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error: any) {
    console.error('Failed to save listing:', error);
    return NextResponse.json({ error: 'Failed to save listing: ' + error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q');

    let listings;
    if (search) {
      listings = db.prepare(`
        SELECT * FROM listings
        WHERE title LIKE ? OR publisher LIKE ? OR suggestedSKU LIKE ?
        ORDER BY createdAt DESC
      `).all(`%${search}%`, `%${search}%`, `%${search}%`);
    } else {
      listings = db.prepare('SELECT * FROM listings ORDER BY createdAt DESC').all();
    }

    return NextResponse.json(listings);
  } catch (error: any) {
    console.error('Failed to get listings:', error);
    return NextResponse.json({ error: 'Failed to get listings: ' + error.message }, { status: 500 });
  }
}
