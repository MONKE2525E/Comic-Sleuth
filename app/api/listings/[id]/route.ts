import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Begin transaction for safety
    const deleteTransaction = db.transaction(() => {
      // Get the original listing
      const item = db.prepare(`SELECT * FROM listings WHERE id = ?`).get(id) as any;
      if (!item) throw new Error("Item not found");

      // Insert into deleted_listings (Trash)
      db.prepare(`
        INSERT INTO deleted_listings (
          id, title, issueNumber, publisher, year, gradeEstimate, gradingNotes,
          valueEstimate, keyFeatures, suggestedSKU, ebayDescription,
          frontImage, backImage, frontImageHighRes, backImageHighRes, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.id, item.title, item.issueNumber, item.publisher, item.year, 
        item.gradeEstimate, item.gradingNotes, item.valueEstimate, 
        item.keyFeatures, item.suggestedSKU, item.ebayDescription,
        item.frontImage, item.backImage, item.frontImageHighRes, item.backImageHighRes, item.createdAt
      );

      // Remove from main listings
      db.prepare(`DELETE FROM listings WHERE id = ?`).run(id);
    });

    deleteTransaction();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: "Failed to delete: " + error.message }, { status: 500 });
  }
}
