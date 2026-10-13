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

That Supabase callback is required for Google → Supabase → LITT LUXURY.

## After Create
1. Copy **Client ID** and **Client secret**.
2. Put them in `littluxry-app/.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=….apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-…
   ```
3. Sync into Supabase (preferred):
   ```bash
   bash scripts/sync-google-oauth.sh
   ```
   Or manually: Supabase → **Authentication** → **Providers** → **Google** → enable → paste Client ID + Secret → Save.
4. Supabase → **Authentication** → **URL Configuration**:
   - Site URL: `https://litt-luxury.com`
   - Redirect allow list:
     - `http://localhost:3000/auth/callback`
     - `https://litt-luxury.com/auth/callback`
     - `https://www.litt-luxury.com/auth/callback`

## If you see “Unable to exchange external code” / invalid_client
The Client **secret** is wrong or rotated. Fix:

1. [Google Cloud → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth client **Lift-Luxury**
2. **Reset secret** → copy the new `GOCSPX-…` value immediately
3. Update `GOOGLE_CLIENT_SECRET` in `.env.local`
4. Run `bash scripts/sync-google-oauth.sh` (probes Google first; refuses bad secrets)
5. Retry https://litt-luxury.com/signin → Continue with Google

## App routes
- Customer: `/signup` wizard · `/signin`
- Admin: `/admin/signin` · `/admin/signup` (invite `LITTLUXURY-OWNER`)
- OAuth return: `/auth/callback`
