# CloudNotes Deployment Guide

This guide provides end-to-end instructions for deploying CloudNotes to the Cloudflare platform within the limits of the **Cloudflare Free Plan**.

---

## Prerequisites

1. A Cloudflare account (sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up)).
2. A GitHub account with access to create/push repositories.
3. Node.js (v18+) and npm installed locally.
4. Wrangler CLI installed (included as a project devDependency).

---

## Step 1: Authenticate Wrangler CLI

Before creating cloud resources, authenticate Wrangler with your Cloudflare account:

```bash
npx wrangler login
```

This will launch a browser window asking you to authorize Wrangler. Once approved, Wrangler stores local credentials securely.

---

## Step 2: Create the Production Cloudflare D1 Database

Run the following command in the project directory:

```bash
npx wrangler d1 create cloudnotes-db
```

### Expected Output Example:
```text
✅ Successfully created DB 'cloudnotes-db'

[[d1_databases]]
binding = "DB"
database_name = "cloudnotes-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

> **IMPORTANT:** Copy the `database_id` value (a UUID) from the terminal output.

---

## Step 3: Update `wrangler.jsonc` Configuration

Open `wrangler.jsonc` in the root of the project and replace `<YOUR_D1_DATABASE_ID>` with your real D1 database ID:

```jsonc
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "cloudnotes-db",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" // <-- Paste your actual UUID here
    }
  ]
```

Save the file.

---

## Step 4: Execute Database Migrations

Apply the initial schema to both your local testing database and the remote production database.

### Apply to Local Database (for local testing):
```bash
npm run db:migrate:local
```

### Apply to Remote Cloudflare Production Database:
```bash
npm run db:migrate:remote
```

When prompted `About to apply 1 migration(s)... continue?`, press `y` and Enter.

Verify migration output:
```text
🌀 Executing on remote database cloudnotes-db:
┌─────────────────────────────┬────────┐
│ name                        │ status │
├─────────────────────────────┼────────┤
│ 0001_create_notes_table.sql │ ✅     │
└─────────────────────────────┴────────┘
```

---

## Step 5: Direct CLI Deployment (Alternative / Pre-GitHub Verification)

To immediately deploy the application from your local machine using Wrangler:

```bash
# 1. Build the React frontend into dist/
npm run build

# 2. Deploy the Worker and static assets
npm run deploy
```

Wrangler will upload your assets and Worker code and provide a live URL:
```text
Uploaded 3 files (dist/)
Deployed cloudnotes triggers (0.50 sec)
  https://cloudnotes.<your-cloudflare-subdomain>.workers.dev
```

---

## Step 6: GitHub Integration with Cloudflare Workers Builds (Recommended)

To achieve continuous deployment on git push, connect your GitHub repository directly to Cloudflare:

### 1. Push code to your GitHub repository
```bash
git init
git add .
git commit -m "feat: initial CloudNotes release"
git branch -M main
git remote add origin https://github.com/dasBulbul03/cloudnotes.git
git push -u origin main
```

### 2. Configure Cloudflare Dashboard
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation, click **Workers & Pages**.
3. Click **Create Application**, then choose the **Workers** tab.
4. Select **Connect to Git** / **GitHub Integration**.
5. Authorize Cloudflare to access your GitHub repository.
6. Select the `cloudnotes` repository and the `main` branch.

### 3. Build & Deployment Settings
Configure the build settings as follows:
- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** `/` (default)
- **Node version:** `20` (or leave default)

### 4. Bindings Configuration
1. Under **Settings** > **Bindings** for your Worker:
2. Ensure the D1 Database binding is attached:
   - **Binding name:** `DB`
   - **D1 Database:** Select `cloudnotes-db` from the dropdown list.
3. Save and deploy.

Whenever new commits are pushed to `main`, Cloudflare will automatically build and deploy your application.

---

## Step 7: Verifying Production Deployment

Once deployed, run the following verification checks against your live `workers.dev` URL:

1. **Health Check:**
   ```bash
   curl -i https://cloudnotes.<your-subdomain>.workers.dev/api/health
   ```
   Verify response is `200 OK` and `"database": "connected"`.

2. **Frontend Loading:**
   Open `https://cloudnotes.<your-subdomain>.workers.dev` in your browser. Verify the dashboard loads, the total note counter appears, and the theme renders properly.

3. **Create Note:**
   Click **+ New Note**, fill in the title and content, and click **Create Note**. Verify the note card appears immediately on the dashboard.

4. **Search Verification:**
   Type a keyword in the search bar. Verify the list filters properly.

5. **Security Headers Verification:**
   ```bash
   curl -I https://cloudnotes.<your-subdomain>.workers.dev/
   ```
   Check that `x-content-type-options: nosniff` and `x-frame-options: DENY` headers are present.

---

## Troubleshooting

### Error: `D1_ERROR: no such table: notes`
- **Cause:** Remote migration was not applied to the production database.
- **Fix:** Run `npm run db:migrate:remote` to apply the migrations to the cloud database.

### Error: `Cannot read properties of undefined (reading 'prepare')`
- **Cause:** The D1 binding name in `wrangler.jsonc` does not match `DB`, or the database ID is missing/invalid.
- **Fix:** Verify `wrangler.jsonc` has `binding: "DB"` and the correct UUID from `npx wrangler d1 list`.

### Error: Frontend displays blank screen or 404 on assets
- **Cause:** React app was not built before deployment.
- **Fix:** Run `npm run build` so `dist/` is created, then deploy again.
