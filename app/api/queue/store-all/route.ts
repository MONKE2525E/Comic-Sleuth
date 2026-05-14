import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST() {
  try {
    const items = db.prepare("SELECT * FROM scan_queue WHERE status = 'completed'").all() as any[];

    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const insertStmt = db.prepare(`
      INSERT INTO listings (
        title, issueNumber, publisher, year, gradeEstimate, gradingNotes,
        valueEstimate, keyFeatures, suggestedSKU, ebayDescription,
        frontImage, backImage, frontImageHighRes, backImageHighRes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const deleteStmt = db.prepare('DELETE FROM scan_queue WHERE id = ?');
    const checkDupe = db.prepare(
      'SELECT id FROM listings WHERE LOWER(title) = LOWER(?) AND issueNumber = ?'
    );

    let stored = 0;
    let skipped = 0;

    const storeAll = db.transaction((itemsToStore: any[]) => {
      for (const item of itemsToStore) {
        if (!item.result) { skipped++; continue; }

        let result: any;
        try {
          result = JSON.parse(item.result);
        } catch {
          console.error(`Skipping queue item ${item.id}: result JSON is corrupted`);
          skipped++;
          continue;
        }

        const dupe = checkDupe.get(result.title, result.issueNumber?.toString());
        if (dupe) { skipped++; continue; }

        insertStmt.run(
          result.title, result.issueNumber?.toString(), result.publisher, result.year?.toString(),
          result.gradeEstimate?.toString(), result.gradingNotes, result.valueEstimate,
          result.keyFeatures, result.suggestedSKU, result.ebayDescription,
          item.frontImage, item.backImage, item.frontImageHighRes, item.backImageHighRes
        );

        deleteStmt.run(item.id);
        stored++;
      }
    });

    storeAll(items);

    return NextResponse.json({ success: true, count: stored, skipped });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to store all: ' + error.message }, { status: 500 });
  }
}
