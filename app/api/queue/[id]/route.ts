import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { processQueueItem } from '@/lib/processQueue';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.prepare('DELETE FROM scan_queue WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === 'retry') {
      const item = db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(id) as any;
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }

      db.prepare("UPDATE scan_queue SET status = 'processing', error = NULL WHERE id = ?").run(id);

      processQueueItem(
        Number(id),
        item.frontImageHighRes || item.frontImage,
        item.backImageHighRes || item.backImage
      ).catch(err => {
        console.error(`Background retry failed for queue item ${id}:`, err);
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'store') {
      const item = db.prepare('SELECT * FROM scan_queue WHERE id = ?').get(id) as any;
      if (!item || item.status !== 'completed' || !item.result) {
        return NextResponse.json({ error: 'Item not ready to store' }, { status: 400 });
      }

      let result: any;
      try {
        result = JSON.parse(item.result);
      } catch {
        return NextResponse.json({ error: 'Stored result is corrupted and cannot be parsed.' }, { status: 422 });
      }

      if (!body.force) {
        const existing = db.prepare(
          'SELECT id, title, issueNumber, publisher FROM listings WHERE LOWER(title) = LOWER(?) AND issueNumber = ?'
        ).get(result.title, result.issueNumber?.toString()) as any;

        if (existing) {
          return NextResponse.json({ duplicate: true, existing }, { status: 409 });
        }
      }

      db.prepare(`
        INSERT INTO listings (
          title, issueNumber, publisher, year, gradeEstimate, gradingNotes,
          valueEstimate, keyFeatures, suggestedSKU, ebayDescription,
          frontImage, backImage, frontImageHighRes, backImageHighRes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        result.title, result.issueNumber?.toString(), result.publisher, result.year?.toString(),
        result.gradeEstimate?.toString(), result.gradingNotes, result.valueEstimate,
        result.keyFeatures, result.suggestedSKU, result.ebayDescription,
        item.frontImage, item.backImage, item.frontImageHighRes, item.backImageHighRes
      );

      db.prepare('DELETE FROM scan_queue WHERE id = ?').run(id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to process: ' + error.message }, { status: 500 });
  }
}
