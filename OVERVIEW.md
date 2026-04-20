# Comic Sleuth — Project Overview

> **For new chat sessions:** This document is the canonical reference for the Comic Sleuth project. Read this top to bottom before touching any code. Keep it updated as you work — if you add a feature, change a route, fix a schema bug, or discover a quirk, update the relevant section here so future sessions don't have to rediscover it.

---

## What Is Comic Sleuth?

Comic Sleuth is a **personal comic book inventory and valuation tool**. The core idea: photograph a comic's front and back cover on your phone, and the app will:

1. **Identify** the comic (title, issue number, publisher, year)
2. **Grade** it on the CGC 0.5–10.0 scale using AI vision
3. **Value** it using Google Search–grounded market data (live eBay sold prices)
4. **Generate** a complete, professional eBay listing description
5. **Store** it locally in SQLite with full image archive

Everything runs locally — no accounts, no cloud backend, no subscriptions. You self-host it (via Docker or `npm run dev`) and the Gemini API key is your only external dependency.

---

## Goals

- **Identify comics fast** — no manual lookup or form-filling
- **Grade objectively** — consistent CGC-scale estimates from AI vision
- **Value accurately** — Gemini uses Google Search to pull current market prices
- **List easily** — pre-written eBay descriptions from each scan
- **Track inventory** — searchable local database with full image archive
- **Be self-hostable** — runs on any machine with Docker; no cloud services required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router, `"use client"` where needed) |
| Language | TypeScript 5 |
| Runtime | Node 20 (via Docker `node:20-slim`) |
| Database | SQLite via `better-sqlite3` 12.8 |
| AI | Google Gemini via `@google/generative-ai` 0.24.1 |
| Image processing | `sharp` 0.34.5 |
| UI | Tailwind CSS v4, Framer Motion 12, Lucide React, Sonner toasts |
| Dev server port | 3005 |

**SDK:** `@google/generative-ai` — `GoogleGenerativeAI` class with `getGenerativeModel`. All AI logic lives in `lib/processQueue.ts` (queue flow) and `app/api/analyze/route.ts` (one-shot endpoint).

---

## Architecture

```
Browser (Next.js App Router)
│
├── /           (Scan)       → upload images → POST /api/queue
├── /queue                   → poll GET /api/queue every 5s
├── /inventory               → GET /api/listings, detail modal
├── /stats                   → GET /api/stats, collection analytics
├── /trash                   → GET /api/trash, restore/destroy
└── /settings                → GET+POST /api/settings, API key management
         │
         ▼
Next.js API Routes (server-side, Node.js)
         │
         ├── better-sqlite3  →  data/comic-inventory.db
         │     ├── listings          (active inventory)
         │     ├── scan_queue        (processing pipeline)
         │     ├── deleted_listings  (soft-delete trash)
         │     └── settings          (API key storage)
         │
         ├── @google/generative-ai  →  Gemini API
         │     model: gemini-3.1-pro-preview
         │     tools: [{ googleSearch: {} }]  (Google Search grounding)
         │
         └── sharp  →  public/uploads/           (compressed, 1200px max, 80% JPEG)
                    →  public/uploads/highres/    (original quality, auto-rotated)
```

---

## User Workflow

### 1. Scan Page (`/`)
Upload or photograph the comic's **front** and **back** covers. Both images are required. Hitting "Add to Processing Queue" does three things immediately:
- Saves both images to disk (compressed + high-res via Sharp)
- Inserts a `scan_queue` record with `status = 'processing'`
- Fires off a background Gemini job (`processQueueItem`) — fire-and-forget, the HTTP response returns immediately so you can queue the next comic

### 2. Processing Queue (`/queue`)
Polls `GET /api/queue` every 5 seconds. Shows each queued comic:

| Status | Meaning |
|---|---|
| `pending` | Waiting to be picked up |
| `processing` | Gemini is actively analyzing |
| `completed` | Analysis ready, awaiting your review |
| `error` | Gemini failed — can retry |

When `completed`, you can **Store** (moves to inventory, deletes the queue record) or delete entirely. **"Store All Completed"** moves everything at once. If you try to store a comic that already exists in inventory (matched on title + issue number, case-insensitive), the UI warns you and asks to confirm before inserting a duplicate.

### 3. Inventory (`/inventory`)
A searchable grid of all stored comics. Click any card for the full detail modal:
- Front and back cover images (with high-res download links)
- Grade estimate, grading notes, value estimate
- Publisher, year, SKU, key issue notes
- eBay description (one-click copy to clipboard)
- Delete button → sends to trash

### 4. Stats (`/stats`)
Collection analytics dashboard. 6 hero stat cards:
- **Total Comics** — count of all inventory records
- **Est. Collection Value** — sum of all `valueEstimate` fields (parsed from "$X" or "$X-$Y" ranges, ranges are averaged)
- **Average Grade** — mean of all `gradeEstimate` values
- **Publishers** — count of distinct publishers
- **Key Issues** — count of comics where `keyFeatures` does NOT contain "Standard issue" (case-insensitive)
- **Highest Grade** — best condition comic's grade

Charts and lists:
- **By Publisher** — horizontal bar chart (top 10), count + total value
- **Grade Distribution** — vertical bar histogram in 5 buckets: 0–2 (Poor), 2–4 (Good), 4–6 (Fine), 6–8 (VF), 8–10 (NM+)
- **By Decade** — horizontal bar chart grouping comics by publication decade (1960s, 1970s, etc.)
- **Top Key Issues** — ranked list of non-standard issues by value (max 10)
- **Recently Added** — thumbnail strip of last 5 comics added (links to inventory)
- **Top 10 Most Valuable** — full list ranked by value

If no inventory exists, shows an empty-state placeholder instead of crashing.

### 5. Trash (`/trash`)
Soft-deleted comics. **Restore** puts them back in inventory. **Destroy** permanently deletes the database record and the actual image files from disk.

### 6. Settings (`/settings`)
Manage the Gemini API key. The key is stored in the `settings` SQLite table (key = `gemini_api_key`). Priority order for key lookup: **DB value > `GEMINI_API_KEY` env var**. The UI shows only the last 4 characters (masked). Docker deployments should set `GEMINI_API_KEY` in `.env.local` as a fallback; users can override via the Settings page without restarting the container.

---

## Gemini AI Integration

**SDK:** `@google/generative-ai` — `GoogleGenerativeAI` class with `getGenerativeModel`  
**Model:** `gemini-3.1-pro-preview`  
**Tools:** `[{ googleSearch: {} }]` — enables Google Search grounding so Gemini can look up current eBay sold prices

**Where it runs:**
- `lib/processQueue.ts` — `processQueueItem()`, imported by both queue routes
- `app/api/analyze/route.ts` — direct one-shot analysis endpoint (not used in the main queue flow)

**What it receives:**
- Front cover image (base64, high-res JPEG read back from disk)
- Back cover image (base64, high-res JPEG read back from disk)
- A detailed structured prompt

**What it returns (JSON, 10 fields):**

| Field | Description |
|---|---|
| `title` | Full comic series name as printed |
| `issueNumber` | Issue number including variant info |
| `publisher` | Marvel, DC, Image, Dark Horse, etc. |
| `year` | Publication year |
| `gradeEstimate` | Numeric CGC-scale grade (0.5–10.0, standard values only) |
| `gradingNotes` | Professional assessment: spine stress, corner condition, staple rust, gloss %, page color |
| `valueEstimate` | Fair market value in USD ("$45" or "$120-$150") |
| `keyFeatures` | First appearances, deaths, variants, or "Standard issue — reader copy" |
| `suggestedSKU` | Auto-generated: `[PUB]-[TITLE]-[ISSUE]-[GRADE×10]` e.g. `MRV-ASM-300-80` |
| `ebayDescription` | 3–5 sentence professional eBay listing copy |

**Retry logic:** `processQueueItem` makes up to 3 attempts with exponential backoff (2s, 4s, 8s) on network errors (`EAI_AGAIN`, `fetch failed`, `getaddrinfo`). Non-network errors fail immediately. On final failure, sets `status = 'error'` in DB.

**JSON parsing:** Gemini sometimes wraps JSON in markdown code fences. The route strips ` ```json ` and ` ``` ` before `JSON.parse`.

---

## Image Pipeline

Every upload produces two versions:

| Version | Storage Path | Max Width | Quality | Used For |
|---|---|---|---|---|
| Compressed | `public/uploads/` | 1200px | 80% JPEG | UI display, queue thumbnails |
| HighRes | `public/uploads/highres/` | Original | 100% JPEG, auto-rotated | Gemini analysis input, download link |

Both use Sharp's `.rotate()` to auto-correct EXIF orientation (phone photos). Filenames are `{prefix}-{Date.now()}.jpg` — unique and cache-safe.

**Serving images:** `app/api/uploads/[filename]/route.ts` serves files from `public/uploads/` with a 1-year `Cache-Control` header. Images in the UI are referenced as `/api/uploads/{filename}` (note: NOT `/uploads/{filename}` directly).

**Cleanup on destroy:** `DELETE /api/trash/[id]` physically removes both compressed and high-res files before deleting the DB record.

---

## Database Schema

Database lives at `data/comic-inventory.db` (the `data/` directory is a Docker volume mount).

**`listings`** — Active inventory

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
title TEXT, issueNumber TEXT, publisher TEXT, year TEXT,
gradeEstimate TEXT, gradingNotes TEXT,
valueEstimate TEXT, keyFeatures TEXT,
suggestedSKU TEXT, ebayDescription TEXT,
frontImage TEXT, backImage TEXT,
frontImageHighRes TEXT, backImageHighRes TEXT,
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

**`scan_queue`** — Processing pipeline

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
frontImage TEXT, backImage TEXT,
frontImageHighRes TEXT, backImageHighRes TEXT,
status TEXT DEFAULT 'pending',  -- pending | processing | completed | error
result TEXT,   -- JSON string of Gemini response (only when completed)
error TEXT,    -- error message (only when status = 'error')
createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

**`deleted_listings`** — Soft-delete trash

```sql
id INTEGER PRIMARY KEY,
title TEXT, issueNumber TEXT, publisher TEXT, year TEXT,
gradeEstimate TEXT, gradingNotes TEXT,
valueEstimate TEXT, keyFeatures TEXT,
suggestedSKU TEXT, ebayDescription TEXT,
frontImage TEXT, backImage TEXT,
frontImageHighRes TEXT, backImageHighRes TEXT,
createdAt DATETIME,
deletedAt DATETIME DEFAULT CURRENT_TIMESTAMP
```

**`settings`** — Configuration key/value store

```sql
key TEXT PRIMARY KEY,
value TEXT NOT NULL
-- Current keys: 'gemini_api_key'
```

All four tables are created with `CREATE TABLE IF NOT EXISTS` in `lib/db.ts` — the deleted_listings table bug that existed in an earlier version has been fixed.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/queue` | Queue new comic (saves images, fires AI job) |
| `GET` | `/api/queue` | Fetch all queue items (ordered by createdAt DESC) |
| `POST` | `/api/queue/[id]` | `action: 'store'` or `action: 'retry'` |
| `DELETE` | `/api/queue/[id]` | Remove from queue (does NOT delete image files) |
| `POST` | `/api/queue/store-all` | Store all completed items at once |
| `GET` | `/api/listings` | Fetch inventory (`?q=search` for full-text search) |
| `POST` | `/api/listings` | Manually add comic (bypasses AI) |
| `DELETE` | `/api/listings/[id]` | Soft delete → moves to `deleted_listings` |
| `GET` | `/api/trash` | Fetch deleted listings |
| `POST` | `/api/trash/[id]` | `action: 'restore'` → move back to inventory |
| `DELETE` | `/api/trash/[id]` | Permanently delete (removes image files + DB record) |
| `GET` | `/api/uploads/[filename]` | Serve image files with 1-year cache header |
| `GET` | `/api/stats` | Collection analytics (all stats for the stats page) |
| `GET` | `/api/settings` | Get API key status (masked) |
| `POST` | `/api/settings` | Save API key to DB |
| `POST` | `/api/analyze` | Direct one-shot AI analysis (not used in main flow) |

### Duplicate Detection
`POST /api/queue/[id]` with `action: 'store'` checks for an existing listing with the same `title` (case-insensitive) and `issueNumber`. If found, returns `HTTP 409 { duplicate: true, existing: {...} }`. The queue UI prompts the user to confirm. Re-submitting with `{ action: 'store', force: true }` bypasses the check.

---

## Key Files

| File | Purpose |
|---|---|
| `app/page.tsx` | Scan page — camera/upload UI, sends to queue |
| `app/queue/page.tsx` | Queue page — 5s polling, review/store/retry UI |
| `app/inventory/page.tsx` | Inventory grid + detail modal with eBay copy |
| `app/stats/page.tsx` | Analytics dashboard — 6 hero cards + 5 charts/lists |
| `app/trash/page.tsx` | Soft-delete management |
| `app/settings/page.tsx` | API key management UI |
| `app/layout.tsx` | Root layout, desktop header nav + mobile bottom nav |
| `app/api/queue/route.ts` | Core: saves images, fires Gemini job, `processQueueItem` |
| `app/api/queue/[id]/route.ts` | Store/retry individual queue items, duplicate check |
| `app/api/queue/store-all/route.ts` | Batch store all completed items |
| `app/api/listings/route.ts` | GET (search) + POST (manual add) |
| `app/api/listings/[id]/route.ts` | DELETE (soft delete to trash) |
| `app/api/trash/route.ts` | GET all deleted |
| `app/api/trash/[id]/route.ts` | Restore or permanently destroy |
| `app/api/uploads/[filename]/route.ts` | Image file server |
| `app/api/stats/route.ts` | All collection analytics computed server-side |
| `app/api/settings/route.ts` | API key CRUD |
| `app/api/analyze/route.ts` | Direct one-shot Gemini analysis (not in main flow) |
| `lib/db.ts` | SQLite init, schema creation (all 4 tables) |
| `lib/getApiKey.ts` | Helper: reads key from DB or falls back to env var |
| `lib/imageUtils.ts` | Shared `saveImage`: saves compressed + high-res via Sharp |
| `lib/processQueue.ts` | Shared `processQueueItem`: Gemini job with retry logic |
| `lib/geminiPrompt.ts` | Shared Gemini analysis prompt (used by queue and analyze routes) |
| `public/uploads/` | Compressed images (1200px, 80% JPEG) |
| `public/uploads/highres/` | Full-res images (original quality, auto-rotated) |
| `data/comic-inventory.db` | SQLite database (Docker volume; gitignored) |
| `Dockerfile` | 3-stage build: deps → builder → runner |
| `docker-compose.yml` | Port 3005, .env.local, data/ volume |
| `.dockerignore` | Excludes node_modules, .next, data, uploads, .git |

---

## Docker Setup

### `docker-compose.yml`
```yaml
services:
  comic-sleuth:
    build: .
    ports:
      - "3005:3005"
    env_file:
      - .env.local
    volumes:
      - ./data:/app/data          # SQLite database persists here
      - ./data/uploads:/app/public/uploads  # Images persist here
    restart: unless-stopped
```

Both the SQLite database and all images survive container rebuilds because they're on host volume mounts. This means:
- Scan results, inventory, and settings are preserved across `docker compose down && docker compose up`
- Old queue items in `scan_queue` with `status = 'error'` will reappear after a rebuild — clean them manually with `DELETE FROM scan_queue WHERE status = 'error'` if needed

### `Dockerfile` (3-stage)
```
deps stage    → npm ci (installs all dependencies including native sharp, better-sqlite3)
builder stage → npm run build (Next.js production build)
runner stage  → copies .next/standalone + public + .next/static, runs node server.js
```

### Clean Rebuild (when compiled output is stale)
Docker's build cache can preserve stale compiled output even after source changes. When this happens (symptom: runtime behavior doesn't match source code), run a full clean rebuild:
```bash
docker compose down
docker rmi comicsleuth-comic-sleuth:latest
docker builder prune -af     # ⚠️ clears ALL Docker build cache (~18GB freed in practice)
docker compose build --no-cache
docker compose up -d
```
Verify the compiled chunks contain the expected model/SDK:
```bash
docker exec <container> grep -roh '"gemini-[^"]*"' /app/.next/server/chunks/
```

---

## Configuration

| Variable | Where | Priority | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | `.env.local` / environment | Fallback | Google AI Studio key |
| `gemini_api_key` | SQLite `settings` table | **Primary** | Set via Settings UI — overrides env var |
| `PORT` | `package.json` scripts | Fixed | 3005 (hardcoded in `npm run dev` and `npm start`) |

API key lookup order: **DB (settings table) → `GEMINI_API_KEY` env var → empty string (will fail at Gemini call)**

---

## Known Issues / Limitations

### No auth / no rate limiting
All API routes are completely open. Fine for local/personal use on a home network. Do not expose this to the public internet.

### Queue polling (not real-time)
The queue page polls every 5 seconds. WebSockets or Server-Sent Events would give real-time updates with less overhead. Not worth changing unless the 5s lag becomes annoying.

### Orphaned images on failed DB writes
If the DB `INSERT` fails after `saveImage` completes, the image files on disk are never cleaned up. Not a correctness issue for normal usage, but disk usage can creep up.

### No pagination
`GET /api/listings` returns all records. Add `LIMIT`/`OFFSET` if inventory grows large enough to cause slow page loads.


---

## Running Locally

```bash
npm install
# Create .env.local with: GEMINI_API_KEY=AIza...
npm run dev   # http://localhost:3005
```

Or via Docker:
```bash
# Create .env.local with: GEMINI_API_KEY=AIza...
docker compose up --build
# App available at http://localhost:3005
```

Production standalone build:
```bash
npm run build
npm start     # binds 0.0.0.0:3005
```

---

## Development History / Decisions

### Model migration (April 2026)
Originally used `@google/genai` SDK with model `gemini-2.5-pro-preview-05-06`. Migrated to `@google/generative-ai` SDK with model `gemini-3.1-pro-preview`. After migration, a Docker build cache corruption issue meant the old compiled chunks persisted in the image despite correct source files — required `docker builder prune -af` + full clean rebuild to resolve.

### Stats page expansion
Stats page expanded from 4 hero cards to 6 (added Key Issues + Highest Grade), and added By Decade, Top Key Issues, and Recently Added sections to complement the existing Publisher Breakdown, Grade Distribution, and Top 10 Most Valuable panels.

### Duplicate detection added to store flow
`POST /api/queue/[id]` with `action: 'store'` now checks for existing inventory matches on title + issue number (case-insensitive) and returns HTTP 409 if a duplicate is found. The queue UI handles this with a confirmation prompt.

### deleted_listings table bug (fixed)
An early version of `lib/db.ts` was missing the `CREATE TABLE IF NOT EXISTS deleted_listings` statement. This caused a crash on the first delete attempt. The bug is fixed in the current `lib/db.ts`.
