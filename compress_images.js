const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.join(__dirname, 'public', 'uploads');
const files = fs.readdirSync(dir);

async function compressAll() {
  for (const file of files) {
    if (file.endsWith('.jpg')) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.size > 2 * 1024 * 1024) { // larger than 2MB
        console.log(`Compressing ${file} (${Math.round(stat.size / 1024 / 1024)}MB)...`);
        const tempPath = filePath + '.tmp';
        await sharp(filePath)
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(tempPath);
        fs.renameSync(tempPath, filePath);
        console.log(`Finished ${file}`);
      }
    }
  }
}

compressAll().catch(console.error);
