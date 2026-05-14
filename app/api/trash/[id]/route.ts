import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();

    if (body.action === 'restore') {
      const transaction = db.transaction(() => {
        const item = db.prepare(`SELECT * FROM deleted_listings WHERE id = ?`).get(id) as any;
        if (!item) throw new Error("Item not found");

        db.prepare(`
          INSERT INTO listings (
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

        db.prepare(`DELETE FROM deleted_listings WHERE id = ?`).run(id);
      });

      transaction();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const item = db.prepare(`SELECT * FROM deleted_listings WHERE id = ?`).get(id) as any;
    
    if (item) {
      // Clean up physical files
      const filesToDelete = [
        item.frontImage, item.backImage, 
        item.frontImageHighRes, item.backImageHighRes
      ].filter(Boolean);

      for (const fileUrl of filesToDelete) {
        // fileUrl is something like /uploads/filename.jpg, we just need the filename part
        const filename = fileUrl.split('/').pop();
        if (filename) {
          const isHighRes = fileUrl.includes('highres');
          const filepath = path.join(
            process.cwd(), 'public', 'uploads', 
            isHighRes ? 'highres' : '', 
            filename
          );
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      }
      
      db.prepare(`DELETE FROM deleted_listings WHERE id = ?`).run(id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete: " + error.message }, { status: 500 });
  }
}
