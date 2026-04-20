import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function GET(req: Request, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;

    // Prevent path traversal — resolve and confirm the path stays inside uploads
    const filepath = path.resolve(UPLOADS_DIR, filename);
    if (!filepath.startsWith(UPLOADS_DIR + path.sep) && filepath !== UPLOADS_DIR) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(filepath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const buffer = fs.readFileSync(filepath);

    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' :
      ext === '.webp' ? 'image/webp' :
      ext === '.gif' ? 'image/gif' :
      'image/jpeg';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(buffer, { headers });
  } catch (error) {
    console.error('Image serve error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
