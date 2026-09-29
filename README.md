# Simple CRM

A sales and support CRM built on MongoDB, Express, React and GraphQL. Leads are worked and converted, deals move through a configurable pipeline, tickets carry an SLA clock, and an AI layer scores leads, answers natural-language searches and drafts follow-ups — with no API key required.

It is a portfolio project, so the interesting parts are the decisions rather than the feature list: how authorization is enforced at the query level rather than after the fact, why the AI never emits a database query, and which abstractions were deliberately *not* built.

```
Lead ──convert──▶ Customer ──▶ Deal ──▶ Pipeline stage ──▶ Won / Lost
                     │
                     └──▶ Support ticket ──▶ SLA clock
      every one of them ──▶ Activity timeline (calls, emails, meetings, notes, tasks)
```

---

## Quick start

**Prerequisites:** Node 18+, pnpm, and a MongoDB instance (local `mongod` or an Atlas cluster).

```bash
git clone <repo-url>
cd crm_app/project

# Server
cd server
pnpm install
cp .env.example .env     # then fill in MONGO_URI and the two JWT secrets
pnpm seed                # roles, users, and a full set of business data
pnpm dev                 # http://localhost:4000/graphql

# Client (second terminal)
cd ../client
pnpm install
pnpm dev                 # http://localhost:5173
```

There is no root `package.json` — `server/` and `client/` are installed and run separately.

### Environment

`server/.env`:

```env
# Required — the server refuses to boot without these
MONGO_URI=mongodb://localhost:27017/simple-crm
JWT_ACCESS_SECRET=<random string>
JWT_REFRESH_SECRET=<a different random string>

# Optional
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<admin password for the seed>
DEMO_PASSWORD=<demo-account password; required when seeding with NODE_ENV=production>

# AI — defaults to the built-in mock provider, so this whole block is optional
AI_PROVIDER=mock          # mock | gemini | mistral
GEMINI_API_KEY=
MISTRAL_API_KEY=
```

`client/.env` (only needed when the API is not on `localhost:4000`):

```env
VITE_API_URL=https://your-api-host
```

### Demo accounts

`pnpm seed` creates four roles and a set of users. Passwords come from `DEMO_PASSWORD` (development falls back to a default printed by the seed).

| Role | Email | Sees |
|---|---|---|
| Admin | from `ADMIN_EMAIL` | everything, plus role and user administration |
| Sales | `demo-sales@example.com` | only the leads, customers and deals assigned to them |
| Sales Manager | `demo-manager@example.com` | the whole team's leads, customers and deals |
| Support | `demo-support@example.com` | tickets and notes, and all customers (read-only) |

Logging in as Sales and then as Sales Manager is the fastest way to see row-level scoping working — the same dashboard shows different totals.

### Useful commands

| Command | Where | Does |
|---|---|---|
| `pnpm seed` | `server` | idempotent seed — roles, users, and business data |
| `pnpm seed:reset` | `server` | wipes business collections first |
| `pnpm test:run` | `server` / `client` | unit and integration tests |
| `pnpm boot:check` | `server` | boots the server against a throwaway database and checks it serves real queries |
| `pnpm e2e:local` | `server` | full Playwright run against a throwaway in-memory replica set |
| `pnpm lint` / `pnpm typecheck` | both | ESLint / `tsc --noEmit` |

`pnpm e2e:local` is the one to use locally: `client`'s own `pnpm e2e` runs Playwright against whatever `MONGO_URI` points at, which may be a real database.

---

## What the app does

**Leads.** Created into an unclaimed pool (`Open`); assigning a rep moves them to `Pending`. Converting a lead creates the matching customer in a transaction and leaves the lead read-only. Leads are archived rather than deleted.

**Customers and deals.** A deal belongs to a customer, an owner and a pipeline stage. `moveDealToStage` is its own mutation rather than a field edit, so it stamps `stage_entered_at` and applies the stage's outcome to the deal's status — the board and the status cannot drift apart. Marking a deal lost requires a reason.

**Pipeline.** Pipelines own ordered stages, each with a `display_order`, a `probability` and an `outcome` of open/won/lost. Validation enforces exactly one won and one lost stage: without terminal stages, "is this deal closed?" has no answer and win rate is undefined. A pipeline with deals on it cannot have its stages replaced, which would orphan them.

**Activity timeline.** One polymorphic `Activity` entity (Call, Email, Meeting, Note, Task) targets any of Lead, Customer, Deal or SupportTicket. It powers the timeline on every detail page, the Tasks screen, and call/email logging. It replaced a single overwritable notes string that lost its contents on every edit.

**Support tickets.** Priority drives the SLA deadline server-side — Urgent 1h, High 4h, Medium 24h, Low 72h — so a client cannot set itself a convenient deadline. First response and resolution are stamped automatically. Raising priority on an unanswered ticket tightens the deadline; lowering it never buys more time.

**Dashboard and analytics.** Every number comes from a MongoDB `$group` aggregation, not from downloading records and counting them in the browser. Weighted pipeline value joins deals to their stage's probability with `$lookup` + `$filter`. The funnel deliberately includes empty stages — those are the interesting ones.

**AI.** Lead scoring with a rationale and a next action, a Cmd/Ctrl+K natural-language search palette, and on-demand summaries and email drafts. See [The AI layer](#the-ai-layer).

---

## Domain model

```
Role ──┐
       ├─< User >──┬──────────────┬───────────────┬──────────────┐
       │           │ assigned_rep │ owner_id      │ assigned_    │ owner_id
       │           │              │               │ agent        │
       │           ▼              ▼               ▼              ▼
       │         Lead          Customer ──┬──▶ Deal          Activity
       │           │                      │      │ stage_id   (polymorphic:
       │           │ customer_id          │      ▼             target_type +
       │           └─────────────────────▶│   Pipeline         target_id →
       │                                  │    └ Stage[]       Lead | Customer |
       │                                  │                    Deal | SupportTicket)
       │                                  └──▶ SupportTicket
       │                                            │
       │                                            └──▶ SupportNote
       └──────────────────────────────────────────────▶ AuditLog
                                                        RefreshToken
```

| Collection | Notes |
|---|---|
| `User`, `Role` | a user holds *many* roles; permissions are the union of all of them |
| `RefreshToken` | opaque, stored as an HMAC only, with a TTL index |
| `Lead` | `status`, `assigned_rep_id`, `customer_id` once converted, plus cached `ai_*` fields |
| `Customer` | created by conversion or directly |
| `Deal` | `value`, `stage_id`, `stage_entered_at`, `expected_close_date`, `closed_at`, `lost_reason` |
| `Pipeline` | embeds `Stage[]` (`display_order`, `probability`, `outcome`) |
| `Activity` | `type`, `target_type` + `target_id` via Mongoose `refPath`, `due_at`, `completed_at` |
| `SupportTicket` | `priority`, `category`, `sla_due_at`, `first_response_at`, `resolved_at` |
| `SupportNote` | internal notes on a ticket — API only, no UI yet |
| `AuditLog` | append-only actor/action/metadata trail |

`Stage` is embedded rather than referenced because stages are only ever read through their pipeline and are edited as a set; keeping them in one document makes the "exactly one won and one lost" invariant enforceable in a single write.

---

## Architecture

```
React ── Apollo Client ── HTTP ── Express ── Apollo Server
                                               │
                                     resolver  │  thin: args in, service out
                                     service   │  permission → validate → scope → transact → audit
                                  repository   │  Mongoose queries, pagination, search
                                  DataLoader   │  per-request batching of relations
                                               ▼
                                            MongoDB
```

**Resolvers are thin.** They unwrap arguments and call a service. No business logic, no permission checks, no Mongoose.

**Services own the rules.** Each one follows the same shape — `require_permission`, zod parse, scope filter, mutate, audit — built from helpers in [server/src/core/service-helpers.ts](server/src/core/service-helpers.ts) rather than inherited from a base class. (Why: [Architecture decisions](#architecture-decisions).)

**Repositories own the queries.** [`BaseRepository`](server/src/core/base-repository.ts) is parameterized by model and searchable fields and provides `find_page`, `find_by_id`, `create`, `update`, `delete`. Page size is clamped to 100 — the old lead query accepted `limit: 100000`.

**DataLoader batches relations,** registered per request in [server/src/graphql/context.ts](server/src/graphql/context.ts). This is measured, not asserted: [`n-plus-one.test.ts`](server/src/__tests__/core/n-plus-one.test.ts) counts real MongoDB driver commands and shows 12 deals with distinct owners and customers resolving in **4 queries instead of 1 + 2N = 25**, with the count flat as rows grow.

**One error strategy.** Services throw from the `AppError` hierarchy in [server/src/utils/errors.ts](server/src/utils/errors.ts); Apollo's `formatError` maps them to GraphQL error codes. One subtlety worth knowing: Apollo wraps a thrown resolver error in a `GraphQLError` and stamps `INTERNAL_SERVER_ERROR` on it *before* `formatError` runs, so `format_error` has to unwrap `originalError` first. Without that, every mapped error — `UNAUTHENTICATED` included — reaches the client as a 500, and every access-token expiry becomes a hard logout instead of a silent refresh.

### Authentication

Short-lived access tokens (15 minutes) plus opaque refresh tokens (30 days) in an `httpOnly` cookie. Refresh tokens rotate on every use and are stored as an HMAC, never in the clear. Replaying a rotated token is treated as theft and revokes every session belonging to that user.

That last rule makes concurrent refreshes dangerous: several queries can fail with `UNAUTHENTICATED` in the same tick, and two simultaneous refreshes look exactly like a replay. [`client/src/lib/auth.ts`](client/src/lib/auth.ts) therefore de-duplicates in-flight refreshes so every caller shares one request.

### Authorization

Two independent mechanisms:

**Permissions** are dotted keys with wildcards — `leads.read`, `deals.*`, `*` — matched exact-first, then wildcard. A user holds the **union** of every role's permissions. The role switcher in the UI is a "view as" preview that narrows the interface only; the `x-active-role-id` header has no effect on server authorization.

**Row-level scoping** decides *which* records, not *whether*. `leads.read` means "the leads assigned to me"; `leads.read.all` means "every lead". [`scope_filter_for`](server/src/core/scoping.ts) returns a Mongoose filter that is applied **inside the query**, never by discarding rows afterwards — so pagination totals and aggregation results stay correct. Analytics pipelines take the same filter as the matching list query.

Leads additionally opt into `include_unassigned`, because the unclaimed pool has to be visible to reps for anyone to pick a lead up.

---

## The AI layer

Three features — lead scoring with next-best-action, natural-language search, and summaries plus email drafting — behind one provider interface in [server/src/ai/provider.ts](server/src/ai/provider.ts).

### The mock provider is the default, and was written first

With `AI_PROVIDER` unset, a fresh clone runs every AI feature with no API key and no network. The mock derives its output from a hash of the prompt, so it is deterministic and tests can assert exact values rather than "the model said something".

Writing it before Gemini or Mistral was the point: nothing in the feature code could quietly grow a dependency on one vendor's response shape. The UI shows a banner when the demo model is answering.

### The model never touches the database

Natural-language search does **not** generate a query. It emits a closed *filter plan*, which is then:

1. validated by a `.strict()` zod schema with enumerated field names ([server/src/ai/search-schema.ts](server/src/ai/search-schema.ts)) — anything unrecognised is rejected, not ignored;
2. compiled by `compile_filter`, which writes only literal keys it controls;
3. `AND`ed with the caller's ownership scope, taken from the request context rather than from the model.

So a question can never widen what someone is allowed to see, and asking about a different entity requires that entity's own permission. An unknown stage name matches nothing rather than being silently dropped.

**A security finding from building this:** `JSON.parse('{"__proto__": {...}}')` creates a genuine own property, and zod's `.strict()` does **not** reject it. The allowlist alone was not enough. All model output now goes through `safe_json_parse`, which strips `__proto__`, `constructor` and `prototype` in a reviver. The first version of the test was also wrong — assigning `obj['__proto__']` sets the prototype instead of creating a key, so it passed for the wrong reason. The tests now parse from a JSON *string*, exactly as production does.

### Cost control is real, not aspirational

Free tiers have low per-minute ceilings, so: a hard timeout via a real `AbortController` (not `Promise.race`, which leaves the request in flight and still burns quota), per-user rate limiting, a content-hash response cache, and exactly one repair retry that shows the model its own validation error.

**Scoring never runs on a read path.** Scores are cached on the lead document with a TTL; list queries never trigger a model call. Bulk scoring is sequential and capped, because bursting is the fastest way to get throttled.

`set_provider` exists as an explicit injection seam — spying on the exported `get_provider` does not work, since calls inside the module resolve the local binding.

---

## Architecture decisions

**No generic CRUD-resolver factory.** The obvious DRY move at eight entities is a factory that generates query and mutation resolvers. It was rejected: it fights per-entity GraphQL naming, hides the schema behind a layer of indirection, and makes the resolver layer harder to read than the duplication it removes. Resolvers stay hand-written and thin; the shared logic lives one layer down, in the services.

**Helpers, not a `BaseService`.** The services do follow a common shape, and a template-method base class would express it. But lead's business logic is genuinely not deal's — conversion writes two documents in a transaction, stage moves stamp a timestamp and derive a status, tickets recompute an SLA. Hook methods would scatter each of those across a base class and an override, so reading one entity's rules would mean reading two files. `parse_or_throw`, `assert_exists`, `assert_found`, `pick_fields` and `audit` are composed instead. This is the KISS half of the brief.

**Validation is duplicated between client and server on purpose.** The zod schemas on the server are the authority; the client forms re-state the same rules so a user gets per-field feedback without a round trip. Sharing one schema across the boundary would couple the client's build to the server's and buy little — the rules are short and change rarely. The server never trusts the client's copy.

**Transactions are scoped, not blanket.** Only lead-to-customer conversion needs one, and it gets one. A transaction wrapper around every mutation would have been tidier and would have broken every test, since standalone `mongod` rejects transactions outright. The test suite runs against a single-node replica set so the rollback path is genuinely exercised rather than silently skipped.

**`updateOne` cannot backdate `created_at`.** Mongoose owns its timestamp fields and silently drops a `$set` on them; the seed uses `save({ timestamps: false })` instead. Worth knowing before debugging why your seeded data is all from today.

**Stages are embedded; activities are polymorphic.** See [Domain model](#domain-model). The polymorphic `Activity` needs Mongoose `refPath`, a GraphQL union and a `__resolveType`, and its targets batch through DataLoader per collection — it is the fiddliest piece of the schema and the one that pays for itself most.

---

## Frontend

**Design tokens.** [`client/src/styles/tokens.scss`](client/src/styles/tokens.scss) carries spacing, radius, typography, shadow, z-index and motion scales, with a single dark override honouring `prefers-color-scheme` and `prefers-reduced-motion`. It replaced a file that declared the same ~80 properties three times over with no scales at all.

**Primitives.** `Button`, `Input`, `Select`, `Field`, `Modal`, `DataTable`, `Card`, `Badge`, `Pagination`, `Toast`, `EmptyState`, `Skeleton`, `PageHeader`. `Modal` has a portal, a focus trap, Escape handling, a scroll lock and `role="dialog"` — none of the original six hand-rolled modals had any of those. `DataTable` handles sorting, empty and loading states once for every list screen.

**Screens** compose `ListPage` + `DataTable` + `Modal`: leads, customers, deals, pipeline board, support, tasks, detail pages for leads/customers/deals, dashboard, profile, and the role and user admin screens. Routes are lazy-loaded and split per route.

**Charts** use Recharts against a palette validated for contrast and colour-vision separation in both themes rather than picked by eye. One gotcha baked into [`use-viz-colors.ts`](client/src/hooks/use-viz-colors.ts): Recharts writes `fill` and `stroke` as SVG *attributes*, where `var()` is not reliably supported, so the tokens are resolved in JS and re-read when the theme changes.

**Typed routes and permissions.** Route paths and permission keys are constants with a `Permission` union type, so a misspelled permission is a compile error rather than a silently hidden button.

---

## Testing

| Suite | Count | Runs against |
|---|---|---|
| Server | 357 tests / 23 files | `mongodb-memory-server` single-node replica set, one shared instance, a database per file |
| Client | 35 tests / 7 files | Vitest + Testing Library |
| E2E | 20 specs | Playwright against a throwaway in-memory replica set (`pnpm e2e:local`) |

Worth calling out:

- **Schema tests** build the real executable schema, assert every resolver module is actually reachable, and cross-check each GraphQL enum against its Mongoose enum. The original code had a whole resolver module that was never merged into the typedefs — 301 lines of passing tests covering an API no client could reach.
- **N+1 is measured** by counting driver `commandStarted` events, not asserted in prose.
- **Token rotation and reuse detection** are covered directly: rotation, replay revoking every session for the compromised user *and only that user*, HMAC-only storage, cookie flags, expiry.
- **The e2e run found bugs no unit test could** — four of five list pages threw on mount in a real browser because a read-only entity's hook passed a *query* where Apollo expected a mutation, and the admin console was gated on `users.read` (which every rep holds so assignment dropdowns can show names) instead of `users.update`.

CI runs four jobs: client lint/typecheck/test/build, server lint/typecheck/test, a **production-install job** that proves runtime dependencies resolve with `--omit=dev` (this repo once shipped with `helmet`, `express-rate-limit` and `zod` in `devDependencies`), and the e2e suite with `AI_PROVIDER=mock`.

---

## Project layout

```
project/
├── server/
│   ├── src/
│   │   ├── ai/            provider interface, gemini/mistral/mock, prompts, search allowlist
│   │   ├── auth/          permission catalog, authorize helpers, token rotation
│   │   ├── core/          base-repository, service-helpers, scoping, transaction
│   │   ├── graphql/       schemas (SDL) + thin resolvers + per-request context
│   │   ├── models/        Mongoose schemas
│   │   ├── repositories/  per-entity query objects
│   │   ├── schemas/       zod input validation
│   │   ├── services/      business rules
│   │   ├── scripts/       seed
│   │   └── __tests__/     schema, N+1, API smoke
│   └── scripts/           e2e-runner.cjs, boot-check.cjs
└── client/
    ├── e2e/               Playwright specs
    └── src/
        ├── components/ui/ primitives
        ├── components/ai/ command palette, AI panels
        ├── hooks/         use-entity-crud, use-resource-page, use-viz-colors
        ├── lib/           apollo, auth, gql documents
        ├── navigation/    route + nav constants
        ├── pages/         screens
        └── styles/        tokens.scss
```

---

## Known gaps

Stated plainly rather than papered over:

- **Soft delete is not universal.** Leads archive; customers, deals, tickets and notes are hard-deleted through the repository.
- **`SupportNote` has an API and no UI.** The resolvers and tests exist; nothing renders them.
- **No GraphQL codegen.** Client types are hand-written. This is the gap that let the original client and server drift apart across untyped `gql` strings — `tsc` could not see it, because the client's types agreed with the client's pages and only disagreed with the server. The e2e suite covers the hole today; codegen would close it.
- **No bulk actions, import/export, saved views or notifications.**
- **Pipeline movement is by explicit controls, not drag-and-drop.** The data model is what makes the board work; drag is polish.

---

## License

Private project.
