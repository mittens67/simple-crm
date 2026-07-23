# Simple CRM

A modern, streamlined Customer Relationship Management system built with MERN stack (MongoDB, Express, React, Node.js). Designed to help sales teams manage leads, convert them to customers, track deals, and handle customer support—all in one place.

## What is a CRM?

A CRM is a tool that helps businesses manage interactions with customers and prospects. Instead of scattered spreadsheets and emails, Simple CRM centralizes all customer information, interactions, and business activities in one organized system.

---

## Core Features

### Leads Management

Track potential customers from first contact through conversion.
- Create and manage leads with contact information
- Assign leads to sales representatives
- Track conversations and interactions with sales notes
- Monitor lead status and progress

### Customers

Convert leads into customers and maintain long-term relationships.
- Auto-created when a lead converts
- Linked to the sales rep who brought them in
- Central hub for all customer interactions

### Deals

Track business opportunities and revenue pipelines.
- Create deals associated with customers
- Set deal value and track progress
- Multiple deal stages to represent sales pipeline
- Monitor total deal value across your team

### Support Tickets

Manage customer issues and support requests.
- Track customer issues and problems
- Assign to support agents
- Link tickets to specific customers
- Internal notes for team collaboration

---

## Business Flow: Lead -> Customer -> Deal -> Support

### The Lead Stage (Start Point)

Someone shows interest in your product or service:

```
Lead Created (Status: Open)
    ↓
Sales Rep Assigned
    ↓
Sales Rep Adds Notes (conversations, interests, objections)
    ↓
Lead Status Progresses (Open → Pending)
    ↓
Decision Point...
```

**Lead Status Options:**
- **Open** — New lead, not yet assigned
- **Pending** — Assigned to a sales rep, in active conversation
- **Archived** — Lead decided not to move forward (terminal state)
- **Converted** — Lead became a customer (terminal state)

---

### The Conversion (Lead to Customer)

When a lead is ready to do business:

```
Lead Status Changed to "Converted"
    ↓
System Auto-Creates Customer Record
    (with same name, email, phone)
    ↓
Sales Rep is Linked as Point of Contact (POC)
    ↓
Archive Notes Recorded (why they converted, deal terms, etc.)
    ↓
Lead is Now Read-Only (cannot be edited)
```

**Key Point:** Each customer stays linked to the rep who brought them in, maintaining the relationship history.

---

### The Deal Stage

Once a customer exists, you can create deals:

```
Customer Created
    ↓
Create Deal(s) for This Customer
    ↓
Deal Has:
  - Title (what's being sold)
  - Value ($ amount)
  - Owner (which rep is managing it)
  - Status (e.g., Negotiating, Closed Won, Closed Lost)
  - Stage (e.g., Proposal, Contract, Implementation)
    ↓
Track Deal Progress Through Pipeline
    ↓
Deal Closes (Won/Lost) — End Point for That Deal
```

**Deal Example:**
- Customer: Acme Corp
- Deal: "Acme Corp - Premium License (1 Year)"
- Value: $50,000
- Status: Negotiating
- Owner: John (the sales rep)

Multiple deals can exist for one customer over time.

---

### Support Tickets

Linked to customers to track issues and service:

```
Customer Has Problem/Question
    ↓
Create Support Ticket
    (linked to customer)
    ↓
Ticket Has:
  - Issue Summary (what's the problem)
  - Assigned Agent (support team member)
  - Status (Open, In Progress, Resolved, Closed)
  - Internal Notes (team collaboration)
    ↓
Support Agent Works on Ticket
    ↓
Issue Resolved
    ↓
Ticket Closed — End Point
```

**Support Example:**
- Customer: Acme Corp
- Ticket: "Can't login to dashboard"
- Assigned to: Sarah (support agent)
- Status: In Progress
- Internal Note: "Reset user password, waiting for confirmation"

---

## Complete Example Journey

```
┌─────────────────────────────────────────────────────────────┐
│                      COMPLETE CUSTOMER JOURNEY              │
└─────────────────────────────────────────────────────────────┘

DAY 1: Sales Process
  • Lead Created: "Acme Corp" → Status: Open
  • Lead Assigned to: John (Sales Rep)

DAY 3: Active Engagement
  • Status Changed to: Pending
  • John Adds Sales Notes: "Very interested, discussing pricing"

DAY 7: Ready to Do Business
  • Status Changed to: Converted
  • System Creates Customer: "Acme Corp"
  • John is Linked as POC
  • Archive Notes: "Signed 1-year contract, $50K deal"
  • Lead is Now Read-Only

DAY 8-60: Customer Relationship
  • Create Deal: "Acme Corp - Premium License"
  • Deal Value: $50,000
  • Deal Status: In Progress
  • John Owns & Tracks This Deal

DAY 15: Customer Support
  • Acme Corp Reports Issue: "Dashboard login broken"
  • Create Support Ticket
  • Assigned to: Sarah (Support Agent)
  • Sarah Resolves Issue in 2 hours
  • Ticket Closed

DAY 60: Deal Closes
  • Deal Status: Closed Won
  • Revenue Recorded: $50,000
  • Deal is Complete

→ Customer Can Still Have Support Tickets
→ New Deals Can Be Created For Same Customer
→ Cycle Continues...
```

---

## Terminal States (Read-Only)

Once a lead reaches these states, it cannot be edited:

- **Archived** — Lead decided not to proceed
- **Converted** — Lead became a customer

You can still view the details and archive notes, but cannot modify them. This prevents accidental changes to closed deals.

---

## User Roles & Permissions

### Admin

- Full access to everything
- Manage users and roles
- View all data across teams
- Configure permissions

### Sales

- Create and manage leads
- Assign leads to team members
- Convert leads to customers
- Create and manage deals
- View customers they own
- Access support tickets (read-only)

### Support

- Create and manage support tickets
- Assign tickets to agents
- View customers and their history
- Add internal notes
- Resolve tickets
- Cannot create leads or deals

---

## Getting Started

### Prerequisites

- Node.js 16+
- MongoDB (local or cloud)
- pnpm (or npm)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd crm_app/project

# Install server dependencies
pnpm install

# Install client dependencies
cd client
pnpm install
cd ..
```

### Environment Setup

Create `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/simple-crm
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=4000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=initial-admin-password
```

### Run the Application

```bash
# Terminal 1: Start the server
pnpm dev

# Terminal 2: Start the client
cd client
pnpm run dev
```

### Seed Initial Data

```bash
# In the project root, run:
pnpm seed
```

This creates:
- Admin user (from `.env` ADMIN_EMAIL and ADMIN_PASSWORD)
- Admin, Sales, and Support roles with their respective permissions

### Demo Accounts

Pre-configured demo accounts are available for testing and demonstrations:

| Role | Email | Password |
|------|-------|----------|
| Sales Rep | demo-sales@example.com | Demo123 |
| Support Agent | demo-support@example.com | Demo123 |

Use these accounts to explore the CRM's features without needing admin access. Demo credentials are displayed on the login screen for convenience.

---

## Architecture

### Frontend (React + TypeScript)

- Modern React 18 with hooks
- Apollo Client for GraphQL queries
- JWT-based authentication
- Role-based access control (RBAC)
- Responsive UI with SCSS styling

### Backend (Node.js + Express)

- Express server with GraphQL API
- MongoDB with Mongoose ODM
- JWT authentication with refresh tokens
- Permission-based authorization
- Secure password hashing with bcryptjs

### Database (MongoDB)

- Collections: Users, Roles, Leads, Customers, Deals, SupportTickets
- Relationships: Leads → Customers, Customers → Deals, Customers → Tickets
- Soft deletes: Status-based rather than hard deletes

---

## Technology & Architecture Highlights

### Frontend Stack

- **React 19 + TypeScript** — Latest React with strict type-checking (`noUnusedLocals`, `noFallthroughCasesInSwitch`)
- **Vite** — Lightning-fast dev server with React Refresh for HMR
- **Apollo Client** — GraphQL client with `InMemoryCache` for intelligent query result caching
- **SCSS** — Powerful stylesheet language with nesting, mixins, variables for maintainable CSS
- **React Router v7** — Modern client-side routing with protected route middleware
- **Light and Dark Mode Theme System** — CSS variables-based theming with React Context, persisted to MongoDB user preferences; toggle available in profile page

**State Management Pattern:**
- Apollo Client handles all remote data (GraphQL queries, mutations, caching)
- React Context (custom `AuthContext`) manages auth state and permissions
- Custom hooks (`useAuth()`, `useCan()`) expose auth state and permission checking to components
- Eliminates Redux complexity for this domain size — minimal, purposeful state

**Advanced Patterns:**
- **Auto-retry with silent session refresh** — Apollo error link detects auth failures and automatically calls `refreshToken`, then retries the failed operation (seamless UX even after token expiration)
- **Permission-based UI rendering** — `useCan(permission)` hook mirrors server permission logic, preventing users from seeing UI they can't use
- **Auth context with useCallback memoization** — login/logout/role-switch functions are stable references, preventing unnecessary re-renders in child components
- **CSS Variables Theming** — Light/dark mode implemented via CSS custom properties (`--bg-primary`, `--text-primary`, etc.) in `theme-variables.scss`, with theme preference persisted to user MongoDB document; theme toggle in profile page with real-time sync across all pages

### Backend Stack

- **Node.js + Express** — Lightweight HTTP server
- **Apollo Server** — GraphQL server with context injection for per-request auth state
- **MongoDB + Mongoose** — NoSQL database with document validation and schema migration support
- **TypeScript** — End-to-end type safety from API to database

**Authorization Architecture:**
- **RBAC with Hierarchical Wildcards** — Permissions stored in database as dotted keys (`"leads.read"`, `"deals.*"`, `"*"`), matched with exact-match-first-then-wildcard logic
- **Permission Catalog Pattern** — Single source of truth for all permissions (`PERMISSION_CATALOG`), exposed to frontend for dynamic role-editor UI
- **Middleware Guards** — `require_auth()` and `require_permission(permission)` helpers wired into every resolver, enforcing auth at the boundary layer
- **Multi-role Users** — Users can hold multiple roles with role-switching UI; resolvers use first role for permission checks

**Database Optimizations:**
- **TTL Indexes** — Refresh tokens auto-expire via MongoDB TTL mechanism (no manual cleanup)
- **Compound Indexes** — `user_id` + `token_hash` for fast session lookups and theft detection
- **Populate for N+1 Prevention** — Root-level `.populate()` on Leads, Customers, Deals, SupportTickets resolvers prevents N+1 queries in the common case
- **Unique Constraints** — Email fields and token hashes prevent duplicates at the database layer
- **Immutable Fields** — ActivityLog and SupportNote use `updatedAt: false` to enforce audit-trail integrity
- **Flexible JSON Storage** — `permissions` (Role) and `metadata` (ActivityLog) use `Schema.Types.Mixed` for schema-less flexibility with dotted-key support

**Security Patterns:**
- **JWT + Refresh Token Rotation** — Short-lived access tokens (15m) + opaque refresh tokens (30d) stored hashed; token rotation on every refresh
- **Session Revocation on Sensitive Changes** — Password changes, user deactivation, or suspicious token reuse revokes all sessions
- **HttpOnly Secure Cookies** — Refresh tokens stored with `httpOnly`, `secure` (prod), `sameSite: lax` to prevent CSRF and XSS theft
- **Bcryptjs Password Hashing** — Passwords hashed with salt rounds before storage; soft-deleted users can't re-authenticate

**GraphQL Design:**
- **Modular Schema Organization** — 8 separate schema files (user, role, lead, customer, deal, support-ticket, support-note) merged via `mergeTypeDefs()`, scaling cleanly as entities grow
- **Input Type Separation** — Distinct `CreateUserInput` vs `UpdateUserInput` types enforce different validation rules at the schema level
- **Enum Types for State** — `LeadStatus`, `DealStatus`, `SupportStatus` enums provide type-safe status constraints (no typos like `"opne"`)
- **Custom Scalar Types** — `JSON` scalar (via `graphql-type-json`) for complex permission maps and audit metadata
- **Consistent Error Codes** — All errors use `GraphQLError` with `extensions.code` (`UNAUTHENTICATED`, `FORBIDDEN`, `BAD_USER_INPUT`) for client-side error handling

### Design Patterns for System Design Interviews

- **RBAC with Wildcards** — Demonstrates permission scaling: exact match → resource wildcard → admin wildcard (O(n) check, n = permission depth)
- **Soft Delete Pattern** — Shows audit-friendly deletion: status mutations preserve history, enable recovery, support compliance audits
- **Session Revocation Chain** — Multi-device logout via central revocation; theft detection via reuse-of-revoked-token → cascade-revoke-all
- **Refresh Token Rotation** — Limits JWT lifetime exposure; refresh rotation prevents unlimited token reuse if a token leaks
- **Middleware Guard Layer** — Authorization at resolver entry-point, not scattered in business logic; prevents bypass paths
- **Permission Catalog as API** — Exposes permission schema to frontend for dynamic UI, avoiding frontend/backend sync bugs

---

## Key Concepts

### Soft Delete Pattern

Instead of deleting records, we use status to mark them as archived:
- Leads use status field: Open, Pending, Archived, Converted
- Support Tickets use status: Open, In Progress, Resolved, Closed
- Historical data is preserved, auditable, and recoverable

### Auto-Customer Creation

When a lead is converted:
1. Lead status changes to "Converted"
2. System automatically creates a new Customer record
3. Same contact information is copied (name, email, phone)
4. Sales rep is linked as the customer's POC
5. Lead record becomes read-only

### Permission Model

Granular, action-level permissions:
- `leads.read` — view leads
- `leads.create` — create new leads
- `leads.update` — edit leads
- `leads.delete` — archive leads
- Similar patterns for customers, deals, tickets, users, roles

---

## Development Notes

### Running Tests

```bash
cd client
pnpm test
```

### Linting

```bash
cd client
pnpm lint
```

### Type Checking

```bash
pnpm typecheck
```

---

## File Structure

```
crm_app/project/
├── server/
│   ├── src/
│   │   ├── graphql/
│   │   │   ├── resolvers/     (business logic)
│   │   │   └── schemas/       (GraphQL type definitions)
│   │   ├── models/            (MongoDB schemas)
│   │   ├── auth/              (auth helpers, permissions)
│   │   ├── scripts/           (seed, migrations)
│   │   └── index.ts           (main server file)
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/             (React pages/routes)
│   │   ├── components/        (reusable components)
│   │   ├── auth/              (auth context, hooks)
│   │   ├── lib/               (utilities, GraphQL queries)
│   │   └── App.tsx            (main app file)
│   └── package.json
└── README.md
```

---

## Support & Contributing

For issues, questions, or feature requests, contact your system administrator.

---

## License

Private project.

---

**Simple CRM** — Manage leads, convert customers, track deals, and support clients. All in one place.
