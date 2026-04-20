import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.resolve(dataDir, 'comic-inventory.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    issueNumber TEXT,
    publisher TEXT,
    year TEXT,
    gradeEstimate TEXT,
    gradingNotes TEXT,
    valueEstimate TEXT,
    keyFeatures TEXT,
    suggestedSKU TEXT,
    ebayDescription TEXT,
    frontImage TEXT,
    backImage TEXT,
    frontImageHighRes TEXT,
    backImageHighRes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scan_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    frontImage TEXT,
    backImage TEXT,
    frontImageHighRes TEXT,
    backImageHighRes TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    error TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deleted_listings (
    id INTEGER PRIMARY KEY,
    title TEXT,
    issueNumber TEXT,
    publisher TEXT,
    year TEXT,
    gradeEstimate TEXT,
    gradingNotes TEXT,
    valueEstimate TEXT,
    keyFeatures TEXT,
    suggestedSKU TEXT,
    ebayDescription TEXT,
    frontImage TEXT,
    backImage TEXT,
    frontImageHighRes TEXT,
    backImageHighRes TEXT,
    createdAt DATETIME,
    deletedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;
