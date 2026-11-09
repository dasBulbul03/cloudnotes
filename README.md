# ☁️ CloudNotes

A modern, production-minded cloud notes management application built natively on **Cloudflare Workers**, **Cloudflare D1**, and **Workers Static Assets**.

> **⚠️ Public Demonstration Notice:** This application is configured as a public demonstration without authentication. Do not store private, sensitive, or confidential notes.

---

## 📌 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Local Development & Setup](#local-development--setup)
- [Database Migrations](#database-migrations)
- [Available Scripts](#available-scripts)
- [API Reference](#api-reference)
- [Cloudflare Deployment](#cloudflare-deployment)
- [GitHub Automatic Deployment](#github-automatic-deployment)
- [Security Considerations](#security-considerations)
- [Documentation Directory](#documentation-directory)

---

## Overview

**CloudNotes** demonstrates how a modern, high-performance, full-stack application can be built entirely within Cloudflare's Free tier ecosystem. It consolidates the React single-page frontend (SPA) and the REST API backend into a **single Cloudflare Worker**, eliminating cross-origin resource sharing (CORS) complexity, separate origin servers, and infrastructure management overhead.

---

## Key Features

- **Full Notes CRUD:** Create, read, update, and delete notes instantly.
- **Real-Time Debounced Search:** Fast search across note titles and contents with 300ms client debouncing and parameterised SQL `LIKE` queries.
- **Interactive Dashboard:** Live metrics displaying total notes count, edge status indicator, and recent notes.
- **Timestamps & Humanized Formats:** Automatic creation and last-updated tracking with relative ("2 hours ago") time indicators.
- **Defensive Input Handling:** Strict character limits (500 chars for title, 100 KB for content), request body size guards, and structured JSON error responses.
- **Destructive Action Guards:** Accessible confirmation modals prevent accidental deletions.
- **Toast Notifications:** Automatic feedback toast banners for create, update, delete, and error events.
- **Responsive & Accessible UI:** Clean, modern SaaS aesthetic built with CSS custom properties, responsive grids, and ARIA attributes.

---

## Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Fast client SPA with strict type checking and zero runtime dependencies beyond React |
| **Styling** | Modern Vanilla CSS | Custom design system with CSS tokens, responsive flex/grid, and shimmer loaders |
| **Backend API** | Cloudflare Workers | Serverless V8 isolates running TypeScript REST endpoints on Cloudflare's global network |
| **Database** | Cloudflare D1 | Serverless distributed SQLite database with ACID compliance and parameterised queries |
| **Asset Hosting** | Workers Static Assets | Built-in Worker asset delivery serving Vite-compiled static assets from edge cache |
| **Tooling & CLI** | Wrangler CLI v3, Node.js, npm | Local emulation of Workers runtime and D1 SQLite storage |
| **CI/CD** | GitHub Actions & Cloudflare Workers Builds | Automated linting, typechecking, and continuous deployment |

---

## Architecture Overview

```
                        ┌───────────────────────────────┐
                        │       GitHub Repository       │
                        └──────────────┬────────────────┘
                                       │ Push to main
                                       ▼
                        ┌───────────────────────────────┐
                        │   Cloudflare Workers Builds   │
                        │   (Builds React & Deploys)    │
                        └──────────────┬────────────────┘
                                       ▼
                        ┌───────────────────────────────┐
                        │      Cloudflare Edge POC      │
                        │  https://<app>.workers.dev     │
                        └───────┬───────────────┬───────┘
                                │               │
          Static Assets Route   │               │  /api/* Route
                                ▼               ▼
                     ┌──────────────────┐  ┌──────────────────┐
                     │  Workers Static  │  │    Worker API    │
                     │      Assets      │  │     Handlers     │
                     │   (React SPA)    │  └────────┬─────────┘
                     └──────────────────┘           │ Parameterised
                                                    │ SQL Queries
                                                    ▼
                                           ┌──────────────────┐
                                           │  Cloudflare D1   │
                                           │ (cloudnotes-db)  │
                                           └──────────────────┘
```

For full architectural diagrams and detailed component breakdowns, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Prerequisites

- **Node.js:** v18.0.0 or later (Node 20+ recommended)
- **npm:** v8.0.0 or later
- **Cloudflare Account:** Free plan registered at [dash.cloudflare.com](https://dash.cloudflare.com/)

---

## Local Development & Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/cloudnotes.git
cd cloudnotes
```

### 2. Install dependencies
```bash
npm install
```

### 3. Log in to Cloudflare with Wrangler
```bash
npx wrangler login
```

### 4. Create local D1 database and apply migrations
```bash
npm run db:migrate:local
```
This runs `wrangler d1 migrations apply cloudnotes-db --local` to initialize SQLite tables inside `.wrangler/state/v3/d1`.

### 5. Build the React frontend
```bash
npm run build
```

### 6. Start the local development server
```bash
npm run dev
```
Wrangler will launch the local environment at `http://localhost:8787` serving both:
- Frontend assets at `http://localhost:8787/`
- REST API at `http://localhost:8787/api/*`

---

## Database Migrations

Database migrations are stored in `/migrations` and applied via Wrangler.

- **Local environment:**
  ```bash
  npm run db:migrate:local
  ```
- **Remote / Production environment:**
  ```bash
  npm run db:migrate:remote
  ```

Schema preview (`migrations/0001_create_notes_table.sql`):
```sql
CREATE TABLE IF NOT EXISTS notes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL CHECK(length(title) > 0 AND length(title) <= 500),
    content    TEXT    NOT NULL CHECK(length(content) <= 100000),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_title   ON notes (title);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes (updated_at DESC);
```

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts local Wrangler edge server with D1 & asset bindings |
| `npm run build` | Compiles React TypeScript app into production `dist/` |
| `npm run typecheck` | Validates types for both frontend and Worker code |
| `npm run lint` | Runs ESLint 9 across source files |
| `npm test` | Executes full 40-assertion E2E test suite against local Worker |
| `npm run db:migrate:local` | Applies SQL migrations to local SQLite storage |
| `npm run db:migrate:remote`| Applies SQL migrations to production Cloudflare D1 |
| `npm run deploy` | Builds and deploys the unified Worker to Cloudflare |

---

## API Reference

All API routes are served under `/api` and return `application/json` accompanied by security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).

### Endpoints

| Method | Route | Description | Request Body | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | Service health & D1 status | None | `200`, `500` |
| `GET` | `/api/notes` | List notes (optional `?q=` search) | None | `200`, `500` |
| `GET` | `/api/notes/:id` | Fetch note by ID | None | `200`, `400`, `404` |
| `POST` | `/api/notes` | Create a note | `{"title":"...","content":"..."}` | `201`, `400`, `500` |
| `PUT` | `/api/notes/:id` | Update note fields | `{"title":"...","content":"..."}` | `200`, `400`, `404` |
| `DELETE` | `/api/notes/:id` | Delete note | None | `200`, `400`, `404` |

---

## Cloudflare Deployment

See the comprehensive step-by-step deployment guide in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

**Quick Summary:**
1. Create a remote D1 database: `npx wrangler d1 create cloudnotes-db`
2. Update the `database_id` placeholder in `wrangler.jsonc` with the returned UUID.
3. Push migrations to production: `npm run db:migrate:remote`
4. Connect the repository to Cloudflare Workers Builds via Cloudflare Dashboard.

---

## GitHub Automatic Deployment

When connected to GitHub through Cloudflare Workers Builds:
1. Every commit pushed to `main` triggers an automatic build on Cloudflare's infrastructure.
2. Cloudflare runs `npm run build` and deploys the unified Worker bundle.
3. Your deployment is instantly live on `https://cloudnotes.<subdomain>.workers.dev`.

Pull requests and code changes are also validated by our GitHub Actions workflow (`.github/workflows/ci.yml`), running ESLint, TypeScript typecheck, and production builds.

---

## Security Considerations

1. **SQL Injection Prevention:** Every database query strictly uses parameter bindings (`?1, ?2`). User strings are never concatenated directly into SQL statements.
2. **Internal Binding Protection:** The D1 binding `env.DB` is isolated inside the Worker runtime and never exposed to the client browser.
3. **HTTP Response Hardening:** Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`) are injected on all responses.
4. **Input Size Guards:** Content bodies are capped at 100 KB and string lengths are strictly validated before DB writes.
5. **Demonstration Policy:** No sensitive data should be saved as this version does not implement authentication.

---

## Documentation Directory

- [Architecture Guide (docs/ARCHITECTURE.md)](docs/ARCHITECTURE.md): Deep-dive into Cloudflare edge architecture, V8 isolates, request lifecycle, and sequence flows.
- [Deployment Guide (docs/DEPLOYMENT.md)](docs/DEPLOYMENT.md): Step-by-step instructions for account provisioning, D1 setup, and Workers Builds integration.
- [Learning Notes & Comparison (docs/LEARNING_NOTES.md)](docs/LEARNING_NOTES.md): Conceptual explanations of Workers, D1, Bindings, and comparison against AWS EC2 + Docker + RDS.
