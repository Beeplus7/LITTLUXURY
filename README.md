# LITTLUXURY

Fashion e-commerce monorepo — React web + Expo mobile, backed by Supabase.

## Structure

```
apps/web          Vite + React + TypeScript
apps/mobile       Expo (React Native) + TypeScript
packages/shared   Shared types + public Supabase client helper
supabase/         Project config + future migrations
```

## Setup

```bash
cd LITTLUXURY
cp .env.example .env          # already filled locally — do not commit .env
npm install
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev:web` | Start Vite web app |
| `npm run dev:mobile` | Start Expo |
| `npm run build:web` | Production web build |

## Environment

- **Public keys only** in `apps/web` and `apps/mobile` (`VITE_*` / `EXPO_PUBLIC_*`).
- **Service role** and **DATABASE_URL** stay in root `.env` for server/CLI use only.
- Never commit `.env` files.

## Status

Foundation only — shop UI, schema, and deployment come next.
