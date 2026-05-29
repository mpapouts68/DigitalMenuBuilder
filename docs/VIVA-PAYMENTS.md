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

## Troubleshooting: `invalid_client`

Viva rejected the **Smart Checkout** OAuth login. Fix on the server `.env`:

| Check | What to do |
|--------|------------|
| Credential type | Use **Smart Checkout Client ID + Client Secret** from **Settings → API Access** — **not** Merchant ID / API Key |
| Environment | Live credentials → `VIVA_ENVIRONMENT=production`. Demo account → `VIVA_ENVIRONMENT=demo` |
| Copy/paste | No quotes around values, no trailing spaces, one line per variable |
| Reload | After editing `.env`: `docker compose --env-file .env up -d --build` |

Test OAuth on the server (does not print secrets):

```bash
cd ~/DigitalMenuBuilder
docker compose --env-file .env exec app node -e "
const id=process.env.VIVA_CLIENT_ID||'';
const sec=process.env.VIVA_CLIENT_SECRET||'';
const env=process.env.VIVA_ENVIRONMENT||'production';
const url=env==='demo'?'https://demo-accounts.vivapayments.com/connect/token':'https://accounts.vivapayments.com/connect/token';
const auth=Buffer.from(id+':'+sec).toString('base64');
fetch(url,{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})
.then(r=>r.json()).then(j=>console.log(j.error||j.error_description||'OK token received')).catch(e=>console.error(e));
"
```

If you see `invalid_client`, regenerate or recopy credentials in the **live** Viva portal and update `.env`.

## Troubleshooting: `no such table: pending_checkouts`

The app creates this table on startup via migration `0034_pending_checkouts`. If card pay fails with that error:

```bash
cd ~/DigitalMenuBuilder
git pull
docker compose --env-file .env up -d --build
docker compose --env-file .env logs app --tail 30
```

Or run once against the live DB volume:

```bash
docker compose --env-file .env exec app node -e "
const Database=require('better-sqlite3');
const db=new Database(process.env.DATABASE_PATH||'/data/menu.db');
db.exec(\`CREATE TABLE IF NOT EXISTS pending_checkouts (
  id text PRIMARY KEY NOT NULL, viva_order_code text, amount_cents integer NOT NULL,
  cart_json text NOT NULL, status text NOT NULL DEFAULT 'pending', order_id integer,
  transaction_id text, failure_event_id integer, created_at integer NOT NULL, expires_at integer NOT NULL
);\`);
console.log('pending_checkouts OK');
"
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
