# Deployment Guide: Render + Vercel

Deploying the API to Render and the SPA to Vercel, with MongoDB Atlas behind them.

> **Read [Cross-site cookies](#cross-site-cookies) before you start.** Splitting the API and the SPA across two domains breaks silent session refresh with the cookie policy this repo ships. It is a one-line change, but you have to make a decision about it.

## Prerequisites

- MongoDB Atlas account with a cluster
- Render account
- Vercel account
- This repository on GitHub

---

## Part 1: API on Render

### Step 1 — MongoDB Atlas

1. Create a cluster (the free tier is fine).
2. Create a database user with a strong password.
3. Under Network Access, allow Render's egress — `0.0.0.0/0` is the pragmatic option on the free tier, which does not offer static IPs.
4. Copy the connection string: `mongodb+srv://user:password@cluster.mongodb.net/simple-crm?retryWrites=true&w=majority`

**Transactions.** Lead-to-customer conversion runs in a transaction, which requires a replica set. Atlas clusters are replica sets, so this works — a single standalone `mongod` would not.

### Step 2 — Create the Render service

New → Web Service → connect the repo, then:

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `pnpm install && pnpm build` |
| Start Command | `pnpm start` |

`pnpm build` compiles with `tsconfig.build.json`, which excludes tests from `dist/`. `pnpm start` runs `node dist/index.js`.

Keep devDependencies installed during the build — TypeScript is needed to compile. (The reverse mistake is the one this repo actually shipped once: `helmet`, `express-rate-limit` and `zod` were in `devDependencies` while runtime code imported them, so `--omit=dev` installs crashed on boot. CI now has a job that catches this.)

### Step 3 — Environment variables

```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/simple-crm?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<random string>
JWT_REFRESH_SECRET=<a different random string>
NODE_ENV=production
PORT=10000

# Required, and easy to miss — see below
ALLOWED_ORIGINS=https://your-app.vercel.app

# Seed accounts
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong password>
DEMO_PASSWORD=<strong password>

# AI — omit entirely to use the built-in mock provider
AI_PROVIDER=mock
```

The server refuses to boot without `MONGO_URI`, `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. `DEMO_PASSWORD` is mandatory when seeding with `NODE_ENV=production`; the seed throws rather than creating demo accounts with a known password on a public host.

Generate secrets:

```bash
openssl rand -base64 32                                      # macOS / Linux
[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 })) # PowerShell
```

**`ALLOWED_ORIGINS` is an exact allowlist, not a wildcard.** [`server/src/index.ts`](server/src/index.ts) compares the request's `Origin` header against this comma-separated list and rejects anything else. It defaults to `http://localhost:5173,http://localhost:3000`, so a deployed frontend is blocked until you set it. Use the scheme and host with no trailing slash, and add every domain Vercel serves you (the production domain, and any preview domains you actually use).

**Rate limiting and proxies.** The server sets `trust proxy` in production, so Render's `X-Forwarded-For` is honoured and users are limited individually. Without it, every request appears to come from the proxy and one active user throttles everyone. Defaults are 1000 requests / 15 min per IP, and 10 auth attempts in the same window; both are configurable via `RATE_LIMIT_MAX` and `AUTH_RATE_LIMIT_MAX`.

### Step 4 — Seed the database

There is **no seed mutation** — seeding is a script, deliberately, since an HTTP endpoint that creates an admin user is not something to expose. Run it locally against the Atlas cluster:

```bash
cd server
MONGO_URI="<your atlas uri>" \
NODE_ENV=production \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='<strong password>' \
DEMO_PASSWORD='<strong password>' \
pnpm seed
```

On PowerShell, set them with `$env:MONGO_URI = "..."` first, then run `pnpm seed`.

The seed is idempotent: roles, the admin user and demo users are created only if missing. `pnpm seed:reset` additionally wipes the business collections — never point that at a database you care about.

---

## Part 2: SPA on Vercel

### Step 1 — Create the project

Add New → Project → import the repo.

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `client` |
| Build Command | `pnpm build` |
| Output Directory | `dist` |

### Step 2 — Environment variable

```
VITE_API_URL=https://crm-api.onrender.com
```

No trailing slash and no `/graphql` — the client appends that itself ([`client/src/lib/apollo.ts`](client/src/lib/apollo.ts)). In dev it ignores this entirely and proxies `/graphql` through Vite.

Vite inlines `VITE_*` variables at build time, so changing this requires a redeploy, not just a restart.

### Step 3 — SPA rewrites

React Router owns the routes, so a hard refresh on `/leads` must still serve `index.html`. Add `client/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Without it, every deep link and every page refresh away from `/` returns a 404.

---

## Cross-site cookies

The refresh token lives in an `httpOnly` cookie set with `sameSite: 'lax'` ([`server/src/auth/tokens.ts`](server/src/auth/tokens.ts)). That is the right default for a same-site deployment and a good CSRF defence.

But `vercel.app` and `onrender.com` are different sites. A `fetch` from one to the other is a cross-site subresource request, and browsers do **not** attach `SameSite=Lax` cookies to those. The consequence is specific and easy to misdiagnose:

- Login appears to work — the access token is returned in the response body and held in memory.
- 15 minutes later the access token expires, the silent refresh fires, the cookie is not sent, and the user is logged out.
- Reloading the page logs them out immediately, because restoring a session depends entirely on that cookie.

Two ways to fix it, in order of preference:

**1. Make it same-site (recommended).** Put the API behind the frontend's domain so no cross-site request happens. On Vercel, add a rewrite so `/graphql` is proxied to Render:

```json
{
  "rewrites": [
    { "source": "/graphql", "destination": "https://crm-api.onrender.com/graphql" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The client also has to ask for the relative path. Today [`client/src/lib/apollo.ts`](client/src/lib/apollo.ts) only uses `/graphql` in dev, and in a production build with `VITE_API_URL` unset it would request `undefined/graphql`. Make the fallback explicit:

```ts
const api_url = import.meta.env.DEV || !import.meta.env.VITE_API_URL
  ? '/graphql'
  : `${import.meta.env.VITE_API_URL}/graphql`;
```

This keeps `SameSite=Lax`, keeps the CSRF protection, and removes CORS from the picture entirely.

**2. Relax the cookie.** Change `refresh_cookie_options` to `sameSite: 'none'` with `secure: true` in production. This works across domains, but `SameSite=None` gives up the CSRF protection that Lax provides, so it should come with an explicit CSRF defence. Note that `secure: true` means it will not work over plain HTTP at all — fine on Render and Vercel, which are HTTPS-only.

The repo ships neither, on purpose: `sameSite` is hardcoded to `lax` with no environment override, because a cookie policy that silently loosens itself based on an env var is worse than one you have to change deliberately.

---

## Verification checklist

- [ ] The Vercel URL loads the login page.
- [ ] Log in as `demo-sales@example.com` with your `DEMO_PASSWORD`.
- [ ] The dashboard renders with real numbers — this proves the aggregations, not just the API, are working.
- [ ] **Refresh the page.** The session must persist. If it does not, re-read [Cross-site cookies](#cross-site-cookies).
- [ ] Wait out the 15-minute access token, or clear it, and confirm the app silently refreshes rather than bouncing to login.
- [ ] Log in as `demo-manager@example.com`: the same dashboard should show **larger** totals than the rep saw. That is row-level scoping working end to end.
- [ ] A Support login sees tickets but no Deals link, and navigating to `/deals` directly is refused by the server, not just hidden.
- [ ] Press Cmd/Ctrl+K and run a natural-language search; with `AI_PROVIDER=mock` a banner says the demo model is answering.
- [ ] Log out and confirm the redirect to login.

---

## Troubleshooting

**Every request fails CORS.** `ALLOWED_ORIGINS` does not contain the exact origin the browser is sending. Compare it character for character against the `Origin` request header — scheme included, no trailing slash. Preview deployments get their own domains and are not covered by the production one.

**`UNAUTHENTICATED` on every request.** `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is unset or changed. Rotating either invalidates all existing tokens, which is intended.

**Logged out after ~15 minutes, or on every refresh.** The cross-site cookie problem above.

**Logged out immediately after logging in on two tabs.** Refresh tokens rotate, and replaying a rotated token is treated as theft and revokes every session for that user. The client de-duplicates concurrent refreshes to prevent this; if you see it, that de-duplication is not running — check that both tabs are on the same build.

**The server will not start.** Check the Render logs for `Missing required environment variable` — the startup now fails loudly rather than crashing later.

**Empty dashboard, login works.** The seed has not run against this database, or it ran against a different one. Check the database name at the end of `MONGO_URI`.

**Transaction errors on lead conversion.** The database is not a replica set. Atlas clusters are; a standalone `mongod` is not.

---

## Render free tier

Free services spin down after 15 minutes of inactivity and take ~30 seconds to wake. The `ServerWakeUp` component ([`client/src/components/ui/server-wake-up.tsx`](client/src/components/ui/server-wake-up.tsx)) pings the `health` query on load and shows a non-blocking banner while the API warms up.

It deliberately does **not** gate the app — an earlier version blocked the entire router, including `/login`, behind that health check, so the first visitor stared at a spinner for 30 seconds before they could even type a password.

For a demo you are actively showing, an external uptime pinger every 10 minutes keeps the service warm.

---

## AI providers in production

`AI_PROVIDER` defaults to `mock`, which needs no key and no network. That is a legitimate way to deploy this — every AI feature works and the UI is honest about which model answered.

For a real model, set `AI_PROVIDER=gemini` with `GEMINI_API_KEY`, or `AI_PROVIDER=mistral` with `MISTRAL_API_KEY`. Both have free tiers; Gemini's is region-restricted and Mistral's requires phone verification. Per-user rate limiting (`AI_RATE_LIMIT_PER_MINUTE`, default 10), response caching (`AI_CACHE_TTL_MS`) and a hard per-call timeout (`AI_TIMEOUT_MS`) are on by default, because free-tier quota is the constraint that actually bites.

Lead scores are cached on the document and never computed during a list query, so browsing the app costs nothing. `scoreLeadsBulk` is sequential and capped for the same reason.
