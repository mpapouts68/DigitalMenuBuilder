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

## 3. Viva dashboard — create a **Redirection** payment source

Your existing **Default** source may be POS-only or Native-only. Smart Checkout needs a **Websites/Apps** source with **Redirection**.

1. Log into **live** Viva (same account as your Smart Checkout Client ID).
2. **Sales → Online payments → Websites/Apps**.
3. Click **Add Website/App** (top right).
4. Fill in:

| Field | Example for Shisha Point |
|--------|----------------------------|
| Name | `Shisha Point menu` |
| Linked account | Your main wallet |
| Protocol | `https` |
| Domain name | `www.shishapoint.site` (no `https://`, no trailing `/`) |
| Integration method | **Redirection / Native Checkout v2** (required) |
| Success URL | `https://www.shishapoint.site/payment/success` |
| Failure URL | `https://www.shishapoint.site/payment/failed` |

5. Accept terms → **Create**.
6. Open the new source and copy the **Source code** (often a 4-digit code, e.g. `4821` — **not** Merchant ID).
7. Put that exact code in server `.env`:

```env
VIVA_SOURCE_CODE=4821
```

8. Redeploy: `docker compose --env-file .env up -d --build`.

If **Default** still returns 403, do **not** use Default — use the source code from the new Websites/Apps entry above.

### Webhooks (recommended)

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

## Troubleshooting: `Unexpected end of JSON input` (or empty Viva response)

This usually meant the server called `response.json()` on an **empty** body from Viva (OAuth or create order). After pulling the latest code, the API returns a clearer message such as `Viva OAuth: empty response body` or `Viva create order: …`.

1. **Redeploy** so `server/viva/client.ts` with safe JSON parsing is running.
2. **Test OAuth on the server** (replace values from `.env`):

```bash
docker compose --env-file .env exec app node -e "
const id=process.env.VIVA_CLIENT_ID;
const secret=process.env.VIVA_CLIENT_SECRET;
const url=process.env.VIVA_ENVIRONMENT==='demo'
  ? 'https://demo-accounts.vivapayments.com/connect/token'
  : 'https://accounts.vivapayments.com/connect/token';
const basic=Buffer.from(id+':'+secret).toString('base64');
fetch(url,{method:'POST',headers:{
  Authorization:'Basic '+basic,
  'Content-Type':'application/x-www-form-urlencoded',
  Accept:'application/json'
},body:'grant_type=client_credentials'})
.then(r=>r.text().then(t=>console.log('status',r.status,'body',t.slice(0,200))))
.catch(e=>console.error(e));
"
```

Expect `status 200` and JSON containing `access_token`. Do **not** add a `scope` parameter — Viva assigns `urn:viva:payments:core:api:redirectcheckout` automatically for Smart Checkout credentials.

If you see **`invalid_scope`**, redeploy the latest app (older builds sent an explicit scope Viva rejects) and confirm you use **Smart Checkout** credentials, not Merchant ID / API Key.

3. **`VIVA_SOURCE_CODE`** must be the **payment source code** from Viva (Sales → Payment sources), e.g. `Default` or a short code shown there — **not** the Smart Checkout Client ID and usually not the Merchant ID. Wrong source codes often return a JSON error; if create-order still fails, check `docker compose logs app` for the full Viva message.

## Troubleshooting: create order **403** (empty body)

OAuth works but `POST /checkout/v2/orders` returns **403**. Common causes:

| Cause | Fix |
|--------|-----|
| Wrong `VIVA_SOURCE_CODE` | Open **Sales → Online payments → Websites/Apps** → your source → copy **Source code** exactly (case-sensitive). Try `Default` if unsure. |
| Source is **Native Checkout** only | Create a **new** source via **Add Website/App** with **Redirection / Native Checkout v2** — editing an old POS source is not enough. |
| Using **Default** but still 403 | Your account’s Default source is not a redirect source. Use the **4-digit Source code** from the new Websites/Apps entry. |
| Demo vs live mismatch | Demo credentials + `VIVA_ENVIRONMENT=demo`, or live + `production`. |

Test create-order on the server (1 cent test order):

```bash
docker compose --env-file .env exec app node -e "
const id=process.env.VIVA_CLIENT_ID;
const sec=process.env.VIVA_CLIENT_SECRET;
const src=process.env.VIVA_SOURCE_CODE||'Default';
const api=process.env.VIVA_ENVIRONMENT==='demo'?'https://demo-api.vivapayments.com':'https://api.vivapayments.com';
const oauth=process.env.VIVA_ENVIRONMENT==='demo'?'https://demo-accounts.vivapayments.com/connect/token':'https://accounts.vivapayments.com/connect/token';
const basic=Buffer.from(id+':'+sec).toString('base64');
(async()=>{
  const t=await fetch(oauth,{method:'POST',headers:{Authorization:'Basic '+basic,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const tok=await t.json();
  if(!tok.access_token){console.log('OAuth',t.status,tok);return;}
  const o=await fetch(api+'/checkout/v2/orders',{method:'POST',headers:{Authorization:'Bearer '+tok.access_token,'Content-Type':'application/json'},body:JSON.stringify({amount:1,customerTrns:'test',merchantTrns:'test-'+Date.now(),sourceCode:src})});
  const body=await o.text();
  console.log('create order',o.status,body.slice(0,300));
})();
"
```

Expect `create order 200` with `orderCode`. If `403`, fix the payment source in Viva (redirection / Smart Checkout), not the Client ID.

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
