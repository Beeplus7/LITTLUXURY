# LITT LUXURY

Fashion e-commerce — Next.js storefront + admin (`littluxry-app`), Expo mobile scaffold, Supabase credentials.

## Primary app

```bash
cd littluxry-app
npm install
npm run dev      # http://localhost:3000
npm run build
```

Demo admin: `owner@littluxry.com` / `admin123`

## Structure

```
littluxry-app/    Next.js 14 App Router storefront + dashboard
apps/mobile/      Expo (React Native) scaffold
packages/shared/  Shared Supabase helpers
supabase/         Project config + future migrations
```

## Environment

Root `.env` holds Supabase keys (gitignored). Never commit secrets.
