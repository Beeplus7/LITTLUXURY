# LITTLUXRY App

Production Next.js 14 (App Router) storefront + admin for LITTLUXRY.

## Run

```bash
cd littluxry-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo admin

- Email: `owner@littluxry.com`
- Password: `admin123`
- Redirects to `/dashboard`

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm start` | Serve production build |

## Structure

- `/` Homepage hero + collection
- `/shop` Collection grid
- `/shop/[id]` Single product + side menu + 50 reviews
- `/cart` · `/checkout`
- `/signin` Auth + settings tabs
- `/dashboard/*` Protected admin (AI Builder, products, media, payments)

Assets live in `public/assets/` (`video.mp4`, Rosso, Riviera). Foundation HTML copies live in `foundations/` (local reference).
