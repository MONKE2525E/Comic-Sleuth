# 🔍 Comic Sleuth

**AI-powered comic book scanner and inventory manager.**

Photograph a comic's front and back covers, and Gemini AI identifies it, estimates its CGC grade and fair market value, and writes a ready-to-paste eBay listing — all stored locally with no subscriptions or cloud accounts required.

---

## How it works

| Step | What happens |
|------|-------------|
| 📷 **Scan** | Upload or photograph the front and back covers |
| 🤖 **Analyze** | Gemini AI identifies the issue, grades condition (CGC scale), estimates value using live eBay data, and generates an eBay description |
| 👀 **Review** | Check the AI's work in the processing queue |
| 📦 **Store** | Move accepted results into your searchable local inventory |
| 💰 **Sell** | Copy the pre-written eBay listing straight from the inventory detail view |

---

## Features

- **AI identification** — title, issue number, publisher, and year from cover photos
- **CGC-scale grading** — consistent condition estimates with detailed grading notes
- **Live market valuation** — Gemini uses Google Search to pull current eBay sold prices
- **eBay listing generator** — professional copy ready to paste
- **Local-first** — SQLite database, no cloud backend, no accounts
- **Self-hostable** — runs on any machine via Docker or `npm run dev`
- **Trash & restore** — soft-delete with full restore support
- **Collection analytics** — value totals, grade distribution, publisher breakdown, key issues

---

## Requirements

- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/) API key (free tier works)

---

## Quick start

```bash
git clone https://github.com/your-username/comic-sleuth.git
cd comic-sleuth
npm install
```

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_key_here
```

```bash
npm run dev
```

Open [http://localhost:3005](http://localhost:3005) and go.

> You can also set or update the API key at any time through the **Settings** page in the UI — no restart needed.

---

## Docker

```bash
# 1. Create .env.local with your API key
# 2. Start the container
docker compose up --build
```

App runs at [http://localhost:3005](http://localhost:3005). The SQLite database and all images persist across rebuilds via the `./data` volume mount.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| AI | Gemini (`@google/generative-ai`) with Google Search grounding |
| Database | SQLite via `better-sqlite3` |
| Images | Sharp — compression + EXIF auto-rotation |
| UI | Tailwind CSS v4, Framer Motion, Lucide icons |
| Runtime | Node.js 20 |

---

## Contributors

| | Name | Role |
|---|---|---|
| 👤 | [MONKE2525E](https://github.com/MONKE2525E) | Creator & maintainer |
| 🤖 | [Claude](https://claude.ai) (Anthropic) | AI pair programmer |

---

## Documentation

See [OVERVIEW.md](OVERVIEW.md) for the full architecture, database schema, API reference, and known limitations.
