import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { saveImage } from '@/lib/imageUtils';
import { processQueueItem } from '@/lib/processQueue';

export async function POST(req: Request) {
  try {
    const { front, back } = await req.json();

    if (!front || !back) {
      return NextResponse.json({ error: 'Both images are required.' }, { status: 400 });
    }

    const frontPaths = await saveImage(front, 'queue-front');
    const backPaths = await saveImage(back, 'queue-back');

    if (!frontPaths || !backPaths) {
      return NextResponse.json({ error: 'Failed to save images.' }, { status: 500 });
    }

    const result = db.prepare(`
      INSERT INTO scan_queue (frontImage, backImage, frontImageHighRes, backImageHighRes, status)
      VALUES (?, ?, ?, ?, 'processing')
    `).run(frontPaths.compressed, backPaths.compressed, frontPaths.highRes, backPaths.highRes);

    const id = result.lastInsertRowid as number;

    processQueueItem(id, frontPaths.highRes, backPaths.highRes).catch(err => {
      console.error(`Background processing failed for queue item ${id}:`, err);
    });

    return NextResponse.json({ success: true, id, status: 'processing' });
  } catch (error: any) {
    console.error('Queue POST error:', error);
    return NextResponse.json({ error: 'Failed to queue images: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const items = db.prepare('SELECT * FROM scan_queue ORDER BY createdAt DESC').all();
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch queue: ' + error.message }, { status: 500 });
  }
}
