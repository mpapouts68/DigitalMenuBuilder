# Viva Smart Checkout (card payments)

Card payments use **Viva Smart Checkout** only (hosted redirect). Cash orders are unchanged.

## 1. Credentials (Viva dashboard)

You need these four values:

| Variable | Where to find it |
|----------|------------------|
| `VIVA_CLIENT_ID` | **Settings → API Access** → Smart Checkout credentials (Client ID) |
| `VIVA_CLIENT_SECRET` | Same screen (Client Secret) — never commit to git |
| `VIVA_SOURCE_CODE` | **Sales → Online payments → Websites/Apps** → open your source → **Source code** (e.g. `Default` or a numeric code) |
| `VIVA_ENVIRONMENT` | `demo` for test credentials, `production` for live |

Use **demo** API hosts with demo credentials; use **production** with live credentials.

## 2. Server `.env` (on the VPS)

SSH to the server, edit `~/DigitalMenuBuilder/.env` (create from `.env.example` if missing):

```env
HOST_PORT=5000
JWT_SECRET=your-long-random-secret

# Viva live — paste your real values here (do not commit this file)
VIVA_ENVIRONMENT=production
VIVA_CLIENT_ID=paste_client_id_here
VIVA_CLIENT_SECRET=paste_client_secret_here
VIVA_SOURCE_CODE=Default
VIVA_SUCCESS_URL=https://www.shishapoint.site/payment/success
VIVA_FAILURE_URL=https://www.shishapoint.site/payment/failed
VIVA_WEBHOOK_KEY=
```

Production uses `accounts.vivapayments.com`, `api.vivapayments.com`, and `www.vivapayments.com` automatically. For sandbox testing only, set `VIVA_ENVIRONMENT=demo`.

## 3. Viva dashboard URLs (payment source)

**Menu → Sales → Online payments → Websites/Apps** → your app/source:

| Field | Value |
|--------|--------|
| Success URL | `https://www.shishapoint.site/payment/success` |
| Failure URL | `https://www.shishapoint.site/payment/failed` |

**Settings → API Access → Webhooks** (recommended):

| Field | Value |
|--------|--------|
| URL | `https://www.shishapoint.site/api/webhooks/viva` |
| Event | Transaction Payment Created (and optionally Transaction Failed) |

If Viva asks for a verification key during webhook setup, set the same value in `VIVA_WEBHOOK_KEY` and redeploy.

HTTPS on the domain is required (Caddy/nginx on ports 80/443).

## 4. Deploy app to server

From your PC (push code first), then on the server:

```bash
cd ~/DigitalMenuBuilder
git pull
docker compose --env-file .env up -d --build
```

Or use the safe deploy script if you use it:

```bash
./scripts/hostman-safe-deploy.sh
```

## 5. Verify

1. Open `https://www.shishapoint.site/menu` → admin → enable card payments if needed.
2. Check API (optional): `curl -s https://www.shishapoint.site/api/payments/provider`  
   Expect: `"provider":"viva"`, `"configured":true`, `"mode":"redirect"`.
3. Test checkout with a real card (live) or, in demo only, `4111111111111111`.
4. Confirm redirect to `/payment/success` and order appears in admin / prints.

## Flow

1. Customer selects **Card** → cart saved → redirect to Viva.
2. **Success** → `/payment/success` → verify → create order → print queue.
3. **Failure** → `/payment/failed` → retry or return to menu.
4. **Webhook** completes order if the customer never hits the success page.

## Bank merchant form (CLF)

- Point 11: **Redirection**
- Point 12: Token / Recurring — unchecked unless you add those products later
