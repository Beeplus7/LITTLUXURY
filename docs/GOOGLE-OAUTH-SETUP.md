# Google OAuth — what to fill (Lift-Luxury client)

Project in console: **VisaguideOS** · Client name: **Lift-Luxury** · Type: **Web application**

## Before you type
Delete empty URI rows that show red “Invalid / Duplicate” errors. Only add the lines below (no blanks).

## Authorized JavaScript origins
| # | URI |
|---|-----|
| 1 | `http://localhost:3000` |
| 2 | `http://127.0.0.1:3000` |
| 3 | `https://litt-luxury.com` |
| 4 | `https://www.litt-luxury.com` |

## Authorized redirect URIs
| # | URI |
|---|-----|
| 1 | `https://ungfnedvfrdxhhfgiovn.supabase.co/auth/v1/callback` |

That Supabase callback is required for Google → Supabase → LITTLUXRY.

## After Create
1. Copy **Client ID** and **Client secret**.
2. Supabase Dashboard → **Authentication** → **Providers** → **Google** → enable → paste Client ID + Secret → Save.
3. Supabase → **Authentication** → **URL Configuration**:
   - Site URL: `https://litt-luxury.com`
   - Redirect allow list:
     - `http://localhost:3000/auth/callback`
     - `https://litt-luxury.com/auth/callback`
     - `https://www.litt-luxury.com/auth/callback`

## App routes
- Customer: `/signup` wizard · `/signin`
- Admin: `/admin/signin` · `/admin/signup` (invite `LITTLUXRY-OWNER`)
- OAuth return: `/auth/callback`
