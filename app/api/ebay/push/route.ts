import { NextResponse } from 'next/server';
import { getEbayToken } from '@/lib/settings';
import db from '@/lib/db';
import { uploadImageToEbay, createEbayListing } from '@/lib/ebay';
import { getShippingCost, getPostalCode } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const { drafts } = await req.json();

    if (!drafts || !Array.isArray(drafts)) {
      return NextResponse.json({ error: 'Drafts array is required.' }, { status: 400 });
    }

    const token = getEbayToken();
    if (!token) {
      return NextResponse.json({ error: 'There is no eBay key. Please put in an eBay key in the settings.' }, { status: 400 });
    }

    let successCount = 0;
    const errors: string[] = [];

    const updateStmt = db.prepare(`
      UPDATE listings 
      SET ebayDescription = ?, valueEstimate = ?, ebayItemId = ?, ebayStatus = ?
      WHERE id = ?
    `);

    const updateErrorStmt = db.prepare(`
      UPDATE listings 
      SET ebayStatus = ?
      WHERE id = ?
    `);

    const getRelativePath = (p: string) => {
      let clean = p;
      if (clean.startsWith('/api')) clean = clean.substring(4);
      if (clean.startsWith('/')) clean = clean.substring(1);
      return clean;
    };

    for (const draft of drafts) {
      try {
        const comic = db.prepare('SELECT * FROM listings WHERE id = ?').get(draft.id) as any;
        if (!comic) throw new Error(`Comic ${draft.id} not found in database.`);

        if (comic.ebayStatus === 'Listed' || comic.ebayStatus === 'ListingInProgress') {
          throw new Error(`Comic ${draft.id} is already ${comic.ebayStatus}. Skipping to prevent duplicate.`);
        }

        // Lock it immediately
        updateErrorStmt.run('ListingInProgress', draft.id);

        const pictureUrls: string[] = [];
        
        if (comic.frontImageHighRes || comic.frontImage) {
          const pathToUse = comic.frontImageHighRes || comic.frontImage;
          const url = await uploadImageToEbay(token, getRelativePath(pathToUse));
          pictureUrls.push(url);
        }
        
        if (comic.backImageHighRes || comic.backImage) {
          const pathToUse = comic.backImageHighRes || comic.backImage;
          const url = await uploadImageToEbay(token, getRelativePath(pathToUse));
          pictureUrls.push(url);
        }

        if (pictureUrls.length === 0) {
           throw new Error(`Comic ${draft.id} has no valid images to upload.`);
        }

        let parsedPrice = Number(draft.price);
        if (isNaN(parsedPrice) || parsedPrice < 0.99) {
           const originalPrice = draft.price;
           parsedPrice = 0.99; // Fallback to eBay's minimum
           errors.push(`Comic ${draft.id} Warning: Price adjusted from "${originalPrice}" to $0.99 (eBay minimum)`);
        }

        const itemId = await createEbayListing(token, {
          title: draft.title || `${comic.title} #${comic.issueNumber}`,
          price: parsedPrice.toFixed(2),
          description: draft.ebayDescription || comic.ebayDescription,
          publisher: comic.publisher,
          issueNumber: comic.issueNumber,
          year: comic.year,
          grade: comic.gradeEstimate,
          categoryId: draft.categoryId || '259104',
          conditionId: draft.conditionId || '4000',
          shippingCost: getShippingCost(),
          postalCode: getPostalCode(),
          pictureUrls
        });

        const formattedPrice = `$${parsedPrice.toFixed(2)} CAD`;
        updateStmt.run(draft.ebayDescription, formattedPrice, itemId, 'Listed', draft.id);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to push comic ${draft.id}:`, err);
        errors.push(`Comic ${draft.id} Failed: ${err.message}`);
        updateErrorStmt.run('Error', draft.id);
      }
    }

    if (successCount === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join(' | ') }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count: successCount, 
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error: any) {
    console.error('eBay Push API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
