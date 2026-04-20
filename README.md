# Comic Sleuth

AI-powered comic book scanner and inventory manager. Photograph a comic's front and back covers, and Gemini AI identifies it, estimates its grade and fair market value, and writes a ready-to-paste eBay listing.

## What it does

1. **Scan** — Upload or photograph front + back covers
2. **Analyze** — Gemini AI identifies the issue, grades condition (CGC scale), estimates value using live market data, and generates an eBay description
3. **Review** — Check the AI's work in the processing queue
4. **Store** — Move accepted results into your searchable inventory
5. **Sell** — Copy the pre-written eBay listing from the inventory detail view

See [OVERVIEW.md](OVERVIEW.md) for full architecture, API reference, and known issues.

## Requirements

- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/) API key (free tier works)

## Local setup

```bash
npm install
```

Create `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

```bash
npm run dev      # http://localhost:3005
npm run build
npm start        # production on port 3005
```

You can also set or change the API key at any time through the Settings page in the UI — no restart needed.

## Docker setup

```bash
# Create .env.local with your API key first
docker compose up --build
# App available at http://localhost:3005
```

Data (SQLite database + all images) persists across container rebuilds via the `./data` volume mount.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Gemini AI** (`@google/generative-ai`) — comic identification, grading, valuation
- **SQLite** (`better-sqlite3`) — local inventory database
- **Sharp** — image compression and EXIF auto-rotation
- **Tailwind CSS v4** + **Framer Motion**
