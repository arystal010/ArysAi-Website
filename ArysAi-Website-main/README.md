# Arys AI

AI chat interface — Cloudflare Workers (backend) + GitHub Pages (frontend).

## Structure

```
docs/      ← frontend served by GitHub Pages
worker/    ← Cloudflare Worker (backend API)
wrangler.toml
```

## GitHub Pages setup

Go to **Settings → Pages** → Source: **Deploy from branch** → Branch: `main` → Folder: `/docs`

## Worker deploy

```
wrangler secret put OPENROUTER_API_KEY
npm run deploy
```
