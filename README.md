# GiveDirect

A multi-tenant donation platform. Creators sign up, build donation pages,
publish them at `/d/<slug>`, and embed them on their own sites via iframe.

> **No payment provider is integrated.** The Donate button renders per the
> design but is disabled, and the app never creates a `Donation` record. The 5%
> platform fee in `src/lib/fees.ts` is a displayed figure only. See the
> "No payments" section of [AGENTS.md](./AGENTS.md).

## Stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TS strict     |
| Styling    | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`) |
| Database   | PostgreSQL 17 + PgBouncer                                   |
| ORM        | Prisma 7 with the `@prisma/adapter-pg` driver adapter       |
| Auth       | Auth.js v5 — credentials + Google, Prisma adapter, JWT      |
| Primitives | Radix UI (unstyled) + CVA + tailwind-merge                  |
| Validation | Zod, shared between client and server                       |
| Forms      | React Hook Form + `@hookform/resolvers/zod`                 |
| Email      | Resend (optional in development)                            |
| Tests      | Vitest — unit, plus integration against a real database     |

## Requirements

- Node.js 20.9+ (developed on 24)
- pnpm 10
- Docker, for the local database

## Running it

```bash
pnpm install                 # also runs `prisma generate`
cp .env.example .env         # then fill in AUTH_SECRET, see below
docker compose up -d         # Postgres on 5442, PgBouncer on 6442
pnpm db:deploy               # apply migrations
pnpm db:seed                 # optional — sample data, see below
pnpm dev                     # http://localhost:3000
```

Generate a secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

The compose stack uses ports **5442** and **6442**, not the Postgres defaults,
so it can run alongside other local databases. `DATABASE_URL` points at
PgBouncer (6442) because that is what production looks like; `DIRECT_URL`
points at Postgres (5442) and is used only by `prisma migrate`.

### What you can visit today

| Route                | State                                                |
| -------------------- | ---------------------------------------------------- |
| `/login`             | Built. Credentials + Google.                          |
| `/signup`            | Built. Password strength meter, honeypot.             |
| `/forgot-password`   | Built.                                                |
| `/reset-password`    | Built. Validates the token before rendering the form. |
| `/verify-email`      | Built.                                                |
| `/dashboard`         | Placeholder — auth-gated, real UI is next.            |
| `/dev/kitchen-sink`  | Every UI component, in every variant. Dev only.       |
| `/`                  | **Blank.** The landing page is not built yet.         |

Start at **`/login`** or **`/dev/kitchen-sink`**. The root URL renders nothing
on purpose — it is a later phase.

### Signing in

`pnpm db:seed` creates two accounts:

- `demo@givedirect.test` / `Password123!` — three pages in different states,
  50 donations and 500 pageviews spread over 60 days
- `second@givedirect.test` / `Password123!` — a second owner, so ownership
  checks have something to fail against

Seeding is optional. `pnpm db:deploy` alone gives you a working, empty app;
the seed just means the dashboard and analytics screens have data to render
instead of empty states. It only touches its own two `@givedirect.test` users,
so re-running it is safe.

## Email in development

`RESEND_API_KEY` is optional. When it is unset, verification and
password-reset emails are **printed to the server console** instead of being
sent, so you can copy the link straight out of the terminal:

```
──────────────────────────────────────────────────────────
 EMAIL NOT SENT — RESEND_API_KEY is not set
──────────────────────────────────────────────────────────
 To:      you@example.com
 Subject: Confirm your email address
 ...
 http://localhost:3000/verify-email?token=...
```

## Google sign-in

Optional. Without `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` the button renders
and fails on click; everything else works. To enable it, create an OAuth
client in Google Cloud Console with this authorised redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

Note that a Google sign-in will **not** link to an existing password account
whose email is unconfirmed — that is an account takeover vector, and the
`signIn` callback in `src/lib/auth.ts` blocks it deliberately.

## Commands

```bash
pnpm dev              # dev server
pnpm build            # production build (runs prisma generate first)
pnpm start            # serve the production build
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm format           # prettier --write

pnpm test             # unit tests — fast, no database
pnpm test:db          # integration tests — needs the database running
pnpm test:watch

pnpm db:deploy        # apply existing migrations (use this to set up)
pnpm db:migrate       # create a new migration after a schema change
pnpm db:seed
pnpm db:studio        # browse the data
pnpm db:reset         # drop, re-migrate, re-seed
```

## Layout

```
src/
  app/
    (auth)/          login, signup, forgot/reset password, verify email
    (dashboard)/     auth-gated app shell
    api/auth/        Auth.js route handler
    dev/             kitchen sink, dev-gated
  components/
    ui/              the shared library — see below
    auth/  brand/
  lib/
    auth.ts          Auth.js config, including the account-linking guard
    auth-guards.ts   requireUser() and friends
    prisma.ts        client singleton over the pg driver adapter
    fees.ts          all money math, unit-tested
    tokens.ts        single-use email + reset tokens (hashed at rest)
    rate-limit.ts    Upstash, or in-memory in development
    email/           Resend wrapper + templates
    validations/     Zod schemas shared client and server
  server/actions/    Server Actions, one file per domain
  proxy.ts           route protection (Next 16's renamed middleware)
prisma/              schema.prisma, seed.ts, migrations/
```

`src/components/ui` is a self-contained library: it imports `@/lib/utils` and
nothing else from the app. ESLint enforces that. It is what makes the folder
liftable into its own package later, and why there is no monorepo here.

## Environment variables

See [.env.example](./.env.example) — every variable is listed with a comment
explaining what it is for and whether it is optional. `src/lib/env.ts` parses
them with Zod and fails loudly at boot rather than producing `undefined`
halfway through a request.

## Design source

The UI follows a Google Stitch export ("Kinetic Clarity"): `#FF5722` accent,
`#B02F00` brand, Inter, 4px radius, flat white cards with 1px outlines and no
drop shadows. Tokens live in `src/app/globals.css`; app code only ever names
roles (`bg-accent`, `text-muted`, `border-subtle`), never hues.
