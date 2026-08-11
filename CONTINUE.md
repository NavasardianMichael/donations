# Resuming this build

Working doc for picking this project back up on a different machine. Delete
this file once the build is finished — it is scaffolding, not documentation
that belongs long-term (that's `AGENTS.md` and `README.md`).

## Setup on a fresh machine

```bash
git pull
pnpm install
cp .env.example .env          # fill in AUTH_SECRET at minimum; see below
docker compose up -d          # Postgres on 5442, PgBouncer on 6442
pnpm db:deploy
pnpm db:seed                  # optional, see README
pnpm dev
```

`ARCA_USERNAME` / `ARCA_PASSWORD` are **not yet available** — the user said
they'll provide them later. Until then `isArcaConfigured()` is false and the
Donate button renders disabled with a translated notice. Everything else
(pages, embed, analytics, dashboard) works without them. Do not block on
these credentials — keep building.

## Where things stand

Done, verified (`typecheck` clean as of last check — re-run the full suite
below before trusting this list):

- Foundation, UI library, Auth.js, Armenian localization (next-intl, single
  locale, no URL prefix), GHEA Grapalat font (self-hosted WOFF2), AMD currency
  (`src/lib/currency.ts`), brand constant (`src/lib/brand.ts` → "Նվիրիր").
- Dashboard shell (sidebar + mobile tab bar), Manage Pages (list/filter/
  search/create/duplicate/delete/publish), per-page tabs (Editor / Settings /
  Embed / Donations), Widget Export chooser, `/faq` with FAQPage JSON-LD,
  marketing shell (`(marketing)` layout, header, footer), Armenian 404.
- **ArCa payments** (`src/lib/payments/arca.ts`) — hosted-checkout client
  against `ipay.arca.am` (BPC/RBS REST family). `registerOrder` +
  `getOrderStatus`. Checkout action (`src/server/actions/checkout.ts`)
  creates a PENDING Donation, registers it, redirects to ArCa's `formUrl`.
  Return route (`src/app/api/payments/arca/return/route.ts`) resolves the
  donation server-to-server — never trusts the browser redirect by itself.
  Reconcile cron (`src/app/api/cron/reconcile-donations/route.ts`, wired in
  `vercel.json`, every 15 min) catches anything the return route missed.
  Receipt + creator-notification emails
  (`src/server/actions/receipts.ts`).
- Public `/d/[slug]` (ISR + `generateStaticParams`) and `/embed/[slug]`
  (bare layout, `frame-ancestors` scoped per-path in `next.config.ts`, height
  reporter via `postMessage`). Thank-you page reads donation status from the
  DB, never from the URL's query params.
- **In progress**: first-party analytics.
  - Done: `src/lib/analytics.ts` (daily-rotating visitor hash, no raw IP),
    `src/app/api/track/route.ts` (the beacon endpoint, rate-limited, always
    204).
  - **Not yet done** (pick up here):
    1. `TrackBeacon` client component — fire-and-forget `fetch("/api/track",
       {method: "POST", body: ...})` on mount. Wire it into
       `src/app/(public)/d/[slug]/page.tsx` (source: "DIRECT") and
       `src/app/embed/[slug]/page.tsx` (source: "EMBED"). Pass
       `document.referrer`.
    2. Nightly rollup cron, `src/app/api/cron/rollup-analytics/route.ts` —
       aggregate `PageView` + `Donation` into `PageDailyStat` per page per
       day (upsert), for roughly the last 3 days (to catch late-reconciled
       donations). Add a second entry to `vercel.json` (`crons`), e.g.
       `"0 2 * * *"`. Follow the same `CRON_SECRET` bearer-token guard as
       `reconcile-donations/route.ts`.
    3. Real `/analytics` dashboard page (currently a placeholder) — date
       range via `?range=7d|30d|90d` query param (links, like
       `PageFilters`, not client state — keeps it SSR-driven). Stat tiles
       (total raised / donation count / average / conversion rate) computed
       live from `Donation`/`PageView`; the trend chart reads
       `PageDailyStat` (already has ~86 seeded rows across 60 days — the
       chart has real data to render even before the rollup cron ever
       runs). Recharts is already installed. Per-page breakdown table,
       referrer table (from `PageView.referrer`, already populated by the
       beacon).
    4. Optional: reuse the same components for a per-page analytics view at
       `pages/[pageId]/analytics`, filtered to one page (the original plan
       calls for this; the per-page tab nav currently only has 4 tabs —
       Editor/Settings/Embed/Donations — add a 5th if this gets built).

## Not started yet

- **Dashboard overview** (`/dashboard`) — still the Phase-3 placeholder
  ("Signed in as X"). Needs the real stat tiles + recent-supporters list from
  the Stitch `dashboard_overview_*` designs. Reuse `Stat` and the donation
  list pattern from `pages/[pageId]/donations/page.tsx`.
- **Marketing pages**: landing (`/`, currently renders nothing), `/contact`
  (Server Action → Resend, honeypot + rate limit, also store in
  `ContactSubmission` — the model already exists in `schema.prisma`),
  `/donation-terms` (fee structure + worked example — generate the numbers
  from `feeBreakdown()` like the FAQ page does, never hand-type "5%"),
  `/privacy`, `/terms`. GA4 via `@next/third-parties/google` in the root
  layout, excluding `/embed/*`.
  - **Known dead links today**: the auth-page footer
    (`src/app/(auth)/layout.tsx`) already links to `/contact` and
    `/donation-terms`. Building these closes that gap.
- **`sitemap.ts` + `robots.ts`** — sitemap from `listPublishedSlugs()`
  (already exists in `src/server/queries/public-pages.ts`); robots
  disallowing `/dashboard`, `/embed`, `/api`, `/pages`, `/settings`,
  `/widget`, `/analytics`.
- **Hardening pass**: error boundaries and loading states per route segment,
  a11y pass, mobile pass, then update `README.md`'s route table (it's stale —
  written before this session's work) and delete this file.

## Non-obvious decisions made this session (don't redo the research)

- **ArCa vendor confusion**: the URL the user gave
  (`arca-payment-gateway.readme.io`) is a **Nigerian** gateway (NGN,
  `ARCPAY-` references, RSA-encrypted create-order/pay-order flow) — a
  same-named but unrelated company. The real Armenian ArCa (Armenian Card
  CJSC) runs the BPC/RBS "iPay" REST family at `ipay.arca.am`. Verified live:
  `POST https://ipay.arca.am/payment/rest/register.do` responds
  `{"errorCode":5,"errorMessage":"Access denied"}` — a real, reachable
  endpoint rejecting us only for lacking credentials. This was confirmed with
  the user before building against it. Do not follow the readme.io docs.
- **DonationStatus** has 5 states, not 4: `PENDING` (row created, not yet
  sent to the gateway) → `AUTHORIZING` (registered, donor may be on ArCa's
  page) → `SUCCEEDED` / `FAILED`. A donation is marked `SUCCEEDED` **only**
  from a server-to-server `getOrderStatus` call (`orderStatus === 2`,
  "Deposited") — never from the browser simply returning to our
  `returnUrl`. That return is a hint to check, not proof of anything.
- **Money fields are `*Minor`, not `*Cents`** — renamed earlier this session
  because AMD's minor unit is the luma, not a cent. Same integer-minor-unit
  discipline as before, just the honest name.
- **`AmountSelector`, `ProgressBar` etc. take `*Minor` props** and read
  `@/lib/currency`, not a hardcoded USD formatter.
- The **UI library still must not call `t()`** — it takes English fallback
  strings via `UiLabels`/`useUiLabels()`, translated once in
  `AppUiLabels` (root layout). Don't add a `useTranslations` import inside
  `src/components/ui/**` — ESLint blocks it, but know why before working
  around it.
- **Zod schemas are factories** over a `MessageResolver` — see
  `src/lib/validations/resolver.ts` for why `resolver(t)` is needed to widen
  next-intl's literal-keyed translator to that interface.
- A component that reads cookies (`currentUser()`, `auth()`) anywhere in a
  route's tree opts that ENTIRE route out of static rendering — this bit us
  once already (the marketing header). `HeaderAuthActions` is a client
  component reading `useSession()` specifically to avoid this. Keep that
  pattern for anything rendered on `/`, `/faq`, `/d/[slug]`, `/embed/[slug]`.

## Verify before trusting any of this

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build
```

`test:db` needs `docker compose up -d` first. If the schema changed since the
last migration (it has — `AUTHORIZING` status, ArCa fields on `Donation`,
`receiptSentAt`), the local dev DB needs a fresh migration:

```bash
npx prisma migrate dev --name add_arca_payments
```

This is additive to the existing schema — no destructive reset should be
needed, but if Prisma proposes one, stop and ask before running it (it will
print the "Claude Code" consent warning either way).
