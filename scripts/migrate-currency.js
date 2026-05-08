const db = require('better-sqlite3')('data/comic-inventory.db');

console.log('Starting currency migration...');

const comics = db.prepare('SELECT id, valueEstimate FROM listings').all();
let updatedCount = 0;

const updateStmt = db.prepare('UPDATE listings SET valueEstimate = ? WHERE id = ?');

for (const comic of comics) {
  if (!comic.valueEstimate || comic.valueEstimate.includes('CAD') || comic.valueEstimate.includes('USD')) {
    // Skip if empty, or already explicitly labeled
    continue;
  }
  
  // Try to find numbers/dollar amounts in the string (e.g., "$120-$150" or "45")
  const regex = /\$?(\d+(?:\.\d+)?)/g;
  const match = comic.valueEstimate.match(regex);
  if (!match) continue;
  
  let newEstimate = comic.valueEstimate;
  
  // Convert all matched numbers
  for (const m of match) {
    const numStr = m.replace('$', '');
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      const cadNum = (num * 1.35).toFixed(2);
      newEstimate = newEstimate.replace(m, `$${cadNum}`);
    }
  }
  
  // Append CAD explicitly so it's not converted again
  newEstimate += ' CAD';
  
  updateStmt.run(newEstimate, comic.id);
  updatedCount++;
}

console.log(`Successfully migrated ${updatedCount} legacy USD listings to CAD.`);
