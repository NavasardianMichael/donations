# Նվիրիր (Nvirir)

A multi-tenant donation platform for the Armenian market. Creators sign up,
build donation pages, publish them at `/d/<slug>`, and embed them on their own
sites via iframe.

> **Two payment providers are integrated**, and the donor chooses between them:
> **ArCa** (`ipay.arca.am`) for Armenian cards in AMD, and **Paddle Billing**
> for international cards in USD. Each is independently optional — without its
> keys that option is simply not offered, and with neither the Donate button
> stays disabled and no live charges run. The 5% platform fee in
> `src/lib/fees.ts` is computed for display and stored on succeeded rows. See
> [AGENTS.md](./AGENTS.md), `src/lib/payments/arca.ts` and
> `src/lib/payments/paddle.ts`.
>
> Paddle cannot settle AMD, so the international amounts come from a second
> ladder the creator authors in page settings. Nothing here converts currency.

Three things worth knowing before reading the code:

- **The interface is entirely in Armenian.** Built on next-intl with a single
  locale and no URL prefix, so adding a second language later is configuration
  rather than a rewrite — see [src/i18n/config.ts](./src/i18n/config.ts).
- **Currency is the Armenian dram (֏)**, displayed in whole drams. Amounts are
  stored as integer minor units (luma) so a processor can be added without
  migrating every row — see [src/lib/currency.ts](./src/lib/currency.ts).
- **The brand name lives in one constant**, `BRAND` in
  [src/lib/brand.ts](./src/lib/brand.ts). Nothing hard-codes it.

## Stack

| Layer      | Choice                                                      |
| ---------- | ----------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TS strict     |
| Styling    | Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`) |
| Database   | PostgreSQL 17 + PgBouncer                                   |
| ORM        | Prisma 7 with the `@prisma/adapter-pg` driver adapter       |
| Auth       | Auth.js v5 — credentials + Google, Prisma adapter, JWT      |
| i18n       | next-intl 4 — Armenian only, single locale, no URL prefix   |
| Fonts      | GHEA Grapalat, self-hosted WOFF2 via `next/font/local`      |
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
pnpm install                 # this is the whole setup — see below
pnpm dev                     # http://localhost:3000
```

`pnpm install` runs [scripts/setup.mjs](./scripts/setup.mjs), so that nothing
here is ever a manual checklist step. In order, it:

1. runs **`prisma generate`** — the client is generated TypeScript source under
   `src/generated/prisma` and gitignored, so every install has to rebuild it;
2. creates **`.env`** from `.env.example` when it is missing, with a real
   `AUTH_SECRET` generated into it (optional keys stay empty, by design);
3. runs **`docker compose up -d`** and waits for Postgres to accept
   connections — but only when the database URL points at this machine and
   nothing is listening on it yet;
4. runs **`prisma migrate deploy`**, so pulling a branch that adds a migration
   applies it on install;
5. runs **`prisma db seed`** only on a database with no migration history at
   all — a first-ever local setup. Never on Vercel, CI or `NODE_ENV=production`.

It is idempotent; re-run it any time with **`pnpm setup`**.

An unreachable database is a warning, not a failed install, so `pnpm install`
still works in CI, in an image build, or with Docker switched off. A database
that _is_ reachable and then rejects the migrations fails the install on
purpose: that is schema drift, and skipping it silently would leave the app
running against a schema that does not match `prisma/migrations`.

| Variable             | Effect                     |
| -------------------- | -------------------------- |
| `SETUP_SKIP=1`       | skip setup entirely        |
| `SETUP_DOCKER=0`     | never start docker compose |
| `SETUP_SEED=1` / `0` | force seeding on / off     |

The same hook covers deployment: any host that runs `pnpm install` before the
build command (Vercel does) applies the migrations there too, with no build
command to change. Set **`DIRECT_URL`** in that environment as well — migrations
cannot run through a transaction-mode pooler, and seeding will not touch it.

The compose stack uses ports **5442** and **6442**, not the Postgres defaults,
so it can run alongside other local databases. `DATABASE_URL` points at
PgBouncer (6442) because that is what production looks like; `DIRECT_URL`
points at Postgres (5442) and is used only by `prisma migrate`.

### What you can visit today

| Route | State |
| --- | --- |
| `/` | Landing page. |
| `/faq`, `/contact`, `/donation-terms`, `/privacy`, `/terms` | Marketing + legal. |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Auth. |
| `/dashboard` | Overview — stats, recent supporters, payouts placeholder. |
| `/pages`, `/pages/new`, `/pages/[pageId]/*` | Manage pages (editor, settings, embed, donations, analytics). |
| `/analytics`, `/widget`, `/settings/payouts` | Dashboard tools. |
| `/d/[slug]`, `/d/[slug]/thank-you` | Public donation page + thank-you. |
| `/embed/[slug]` | Embeddable widget (no chrome, frame-ancestors open). |
| `/dev/kitchen-sink` | Every UI component. Dev only. |

Start at **`/`**, **`/login`**, or **`/dev/kitchen-sink`**.

### Signing in

The seed — which your first `pnpm install` ran for you, and `pnpm db:seed` runs
again — creates two accounts, both with password `Password123!`:

- `demo@nvirir.test` — three Armenian campaigns in different states, plus 50
  donations and 500 pageviews spread over 60 days. Most are ArCa donations in
  drams; roughly one in six is a Paddle donation in USD, so the mixed-currency
  totals have something real to render
- `second@nvirir.test` — a second owner, so ownership checks have something to
  fail against

The data is only there so the dashboard and analytics screens have something to
render instead of empty states; an unseeded database is a perfectly working,
empty app. Re-running is safe — the seed touches only its own two
`@nvirir.test` users.

## Translations

All copy lives in [messages/hy.json](./messages/hy.json). Nothing user-facing
is hard-coded anywhere in the app:

- **Components** call `useTranslations()` / `getTranslations()`.
- **Zod schemas** are factories taking a message resolver, so one schema serves
  both the browser and Server Actions in the right language. See
  [src/lib/validations/resolver.ts](./src/lib/validations/resolver.ts).
- **The UI library** cannot call `t()` — that would couple a reusable library
  to this catalogue. It declares the strings it needs as `UiLabels` and the app
  supplies them once, translated, in the root layout.
- **Emails** take a translator too.

Copy follows Armenian orthography: `։` as the sentence-final mark and `՞`
placed over the questioned vowel (`Մոռացե՞լ եք գաղտնաբառը`), with formal `Դուք`
address throughout.

A missing key is loud, not silent: `src/i18n/request.ts` logs it in development
and renders `⚠️ namespace.key`. The integration tests resolve against the real
catalogue and throw outright.

### Adding a second language

1. Add the code to `LOCALES` in `src/i18n/config.ts` and drop a
   `messages/<code>.json` beside `hy.json`.
2. Move `src/app/**` under an `app/[locale]/` segment.
3. Add next-intl's routing middleware to `proxy.ts`.

No component changes are required.

## Money

Amounts are integer **minor units** everywhere — luma for AMD, cents for USD.
Display conversion happens only at the render boundary.

AMD's ISO 4217 exponent is 2, but nobody quotes luma, so it renders with zero
fraction digits: `500000` in the database is `5000 ֏` on screen. Keeping the
two-decimal storage means a processor expecting minor units drops in later
without a data migration.

## Email in development

`RESEND_API_KEY` is optional. When unset, verification and password-reset
emails are **printed to the server console** instead of being sent, so you can
copy the link straight out of the terminal.

## Google sign-in

Optional. Without `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` the button renders
and fails on click; everything else works. To enable it, create an OAuth client
in Google Cloud Console with this authorised redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

A Google sign-in will **not** link to an existing password account whose email
is unconfirmed — that is an account takeover vector, and the `signIn` callback
in `src/lib/auth.ts` blocks it deliberately.

## Commands

```bash
pnpm setup            # what `pnpm install` runs: generate, compose up, migrate
pnpm dev              # dev server
pnpm build            # production build (runs prisma generate first)
pnpm start            # serve the production build
pnpm typecheck        # tsc --noEmit
pnpm lint             # eslint
pnpm format           # prettier --write

pnpm test             # unit tests — fast, no database
pnpm test:db          # integration tests — needs the database running
pnpm test:watch

pnpm db:migrate       # create a new migration after a schema change
pnpm db:deploy        # apply existing migrations by hand — `pnpm setup` does it
pnpm db:seed
pnpm db:studio        # browse the data
pnpm db:reset         # DESTRUCTIVE — drops, re-migrates, re-seeds
```

## Layout

```
src/
  app/
    (auth)/          login, signup, forgot/reset password, verify email
    (dashboard)/     overview, pages, analytics, widget, payouts
    (marketing)/     landing, faq, contact, legal pages
    (public)/        /d/[slug] donation pages
    embed/           iframe widget
    api/             auth, track, ArCa return, crons
    sitemap.ts / robots.ts
  components/
    ui/              the shared library — see below
    auth/ brand/ dashboard/ donation/ marketing/
  i18n/              locale config, request config
  lib/               auth, brand, currency, fees, payments/{arca,paddle}, email, …
  server/
    actions/         mutations (auth, pages, checkout, contact, …)
    queries/         RSC reads (pages, analytics, overview, …)
  proxy.ts           route protection (Next 16's renamed middleware)
messages/hy.json     every user-facing string
prisma/              schema.prisma, seed.ts, migrations/
```

`src/components/ui` is a self-contained library: it imports `@/lib/utils` and
`@/lib/currency` and nothing else from the app. ESLint enforces that. It is
what makes the folder liftable into its own package later, and why there is no
monorepo here.

## Environment variables

See [.env.example](./.env.example) — every variable is listed with a comment
explaining what it is for and whether it is optional. `src/lib/env.ts` parses
them with Zod and fails loudly at boot rather than producing `undefined`
halfway through a request.

## Design source

The UI follows a Google Stitch export ("Kinetic Clarity"): `#FF5722` accent,
`#B02F00` brand, 4px radius, flat white cards with 1px outlines and no drop
shadows. Tokens live in `src/app/globals.css`; app code only ever names roles
(`bg-accent`, `text-muted`, `border-subtle`), never hues.

Type is **GHEA Grapalat** by Edik Ghabuzyan — a Palatino-derived Armenian
serif, converted from the supplied OTFs to WOFF2 (848 KB → 265 KB). The family
ships only weights 400 and 700, so `src/lib/fonts.ts` declares `100 500` and
`600 900` ranges: `font-medium` snaps to Regular and `font-semibold` to true
Bold, with no synthesised faux-bold on Armenian letterforms.
