import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface SavedImagePaths {
  compressed: string;
  highRes: string;
}

export async function saveImage(base64String: string, prefix: string): Promise<SavedImagePaths | null> {
  if (!base64String || !base64String.startsWith('data:image')) return null;

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  try {
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}-${Date.now()}.jpg`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const highResDir = path.join(uploadDir, 'highres');

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    if (!fs.existsSync(highResDir)) fs.mkdirSync(highResDir, { recursive: true });

    await sharp(buffer).rotate().jpeg({ quality: 100 }).toFile(path.join(highResDir, filename));
    await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(path.join(uploadDir, filename));

    return {
      compressed: `/uploads/${filename}`,
      highRes: `/uploads/highres/${filename}`,
    };
  } catch (err) {
    console.error(`saveImage failed for prefix "${prefix}":`, err);
    return null;
  }
}
