# Նվիրիր (Nvirir)

A multi-tenant donation platform for the Armenian market. Creators sign up,
build donation pages, publish them at `/d/<slug>`, and embed them on their own
sites via iframe.

> **ArCa hosted checkout is integrated** (`ipay.arca.am`), but without
> `ARCA_USERNAME` / `ARCA_PASSWORD` the Donate button stays disabled and no
> live charges run. The 5% platform fee in `src/lib/fees.ts` is computed for
> display (and stored on succeeded rows). See [AGENTS.md](./AGENTS.md) and
> `src/lib/payments/arca.ts`.

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

Start at **`/`**, **`/login`**, or **`/dev/kitchen-sink`**. Seed the DB if you
want the dashboard and analytics screens to show sample data.

### Signing in

`pnpm db:seed` creates two accounts, both with password `Password123!`:

- `demo@nvirir.test` — three Armenian campaigns in different states, plus 50
  donations and 500 pageviews spread over 60 days, all in drams
- `second@nvirir.test` — a second owner, so ownership checks have something to
  fail against

Seeding is optional. `pnpm db:deploy` alone gives you a working, empty app; the
seed just means the dashboard and analytics screens have data to render instead
of empty states. It only touches its own two `@nvirir.test` users, so
re-running it is safe.

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
  lib/               auth, brand, currency, fees, payments/arca, email, …
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
