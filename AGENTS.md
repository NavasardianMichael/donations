<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Նվիրիր (Nvirir)

Multi-tenant donation platform for the ARMENIAN market. Creators publish
donation pages at `/d/[slug]`, embed them via iframe, and track donations and
traffic. The platform takes a 5% fee per transaction — a displayed figure
only; see "No payments" below.

## Version notes that differ from common defaults

- **Next.js 16** — `middleware.ts` is deprecated, use **`proxy.ts`** with an
  exported `proxy()` function. Turbopack is the default for `dev` and `build`.
  `params`/`searchParams`/`cookies()`/`headers()` are async-only.
  `revalidateTag` requires a `cacheLife` profile as its second argument.
- **Prisma 7** — connection URLs live in `prisma.config.ts`, not
  `schema.prisma`. The client is constructed with a driver adapter
  (`@prisma/adapter-pg`). Generated client is TypeScript source in
  `src/generated/prisma`, imported as `@/generated/prisma/client`.
- **Tailwind v4** — CSS-first config in `src/app/globals.css` via `@theme
inline`. There is no `tailwind.config.js`. Dark mode is a `@custom-variant`
  bound to `.dark` because next-themes toggles a class.
- **React 19** — components take `ref` as a normal prop. No `forwardRef`.

## Armenian only

The entire interface is Armenian. There is no language switcher and no locale
segment in the URL.

- **Never hard-code a user-facing string.** Every one lives in
  `messages/hy.json` and is reached with `useTranslations()` (client) or
  `getTranslations()` (server).
- **Zod schemas are factories** taking a `MessageResolver`, so one schema
  serves both surfaces. Wrap a next-intl translator with `resolver()` from
  `src/lib/validations/resolver.ts` — the two signatures are contravariantly
  incompatible and the widening is deliberate and documented there.
- **`src/components/ui` must not call `t()`.** A component library that
  imports this app's catalogue stops being a library. It declares its own
  strings in the `UiLabels` interface; `AppUiLabels` in the root layout
  supplies them translated.
- **Never branch on message text.** `/expired|already used/.test(message)`
  silently stops matching the moment copy is translated. Return a flag —
  `ActionResult.tokenInvalid` is the precedent.
- **Orthography**: `։` (U+0589) ends a sentence, not `.`. The question mark
  `՞` goes over the last vowel of the questioned word (`Մոռացե՞լ եք`), not at
  the end of the clause. Address users formally, as `Դուք`.
- A missing key logs in development and renders `⚠️ namespace.key`; the
  integration tests resolve against the real catalogue and throw.

## Money is drams

Default currency is **AMD**, displayed in whole drams (`5000 ֏`). Storage is
integer **minor units** (luma) — field names end in `Minor`, never `Cents`.
`src/lib/currency.ts` owns the conversion; `src/lib/fees.ts` owns the fee math.

Do not assert on formatted money with plain spaces: ICU uses U+00A0 between
groups and before `֏`. Normalise first, as `src/lib/fees.test.ts` does.

## Brand

`BRAND` in `src/lib/brand.ts` is the only place the product name appears.
Never write "Նվիրիր" (or any other name) as a literal.

## No payments

There is **no payment provider integrated, and none should be added** without
an explicit request. Concretely:

- The Donate button on a public page is **disabled**, with a notice that
  donations are not enabled yet. The amount selector still renders and
  validates, because it is part of the design.
- **The app never writes a `Donation` row.** That table is populated by the
  seed script and read by the dashboard, donation history and analytics.
- `src/lib/fees.ts` computes the 5% platform fee for _display_ only. Nothing
  moves money. A processor's own fee is a second, separate concept and belongs
  in that file when the time comes.
- Do not install a payment SDK, add provider env vars, create webhook routes,
  or build onboarding/payout screens.

## Non-negotiables

1. **Money is integer cents.** Never floats. All fee math lives in
   `src/lib/fees.ts` and is unit-tested. Format only at the render boundary
   with `formatCurrency()`.
2. **Server Actions are public HTTP endpoints.** Every one needs a session
   check _and_ an ownership check. Being inside a protected layout grants no
   protection.
3. **Input from the client is untrusted.** Zod-validate every Server Action
   argument, and re-derive anything security-relevant server-side.
4. **`revalidatePath('/d/' + slug)` after every page mutation**, or the cached
   public page contradicts the database.
5. **Frame headers are scoped per-path.** A global `X-Frame-Options: DENY`
   silently breaks every embed. `/embed/*` sets `frame-ancestors *`.
6. **`src/components/ui` imports nothing from app code except `@/lib/utils`.**
   Enforced by ESLint. That rule is what makes it a library.
7. **No raw palette values in app code.** `bg-accent`, not `bg-orange-500`.
8. **Tailwind classes are never built by concatenation** — the scanner reads
   source text. Map to full class strings.

## Layout

```
src/
  app/            (marketing) (auth) (dashboard) (public) embed api
  components/ui/  the shared library — barrel export in index.ts
  components/     dashboard/ donation/ marketing/
  lib/            auth prisma fees env utils validations/
  server/         actions/ (mutations)  queries/ (reads, RSC-only)
prisma/           schema.prisma  seed.ts  migrations/
```

## Design source

Screens come from the Google Stitch export "Kinetic Clarity" at
`C:\Users\navas\Downloads\stitch_orange_donation_platform`. Directories whose
`code.html` is byte-identical to `dashboard_overview_1/code.html` are **drafts**
— reference only. The unique files (and any directory containing a
`screen.png`) are the real designs and are implemented as-is, including their
tablet and mobile variants.

## Commands

```
pnpm dev            docker compose up -d   # Postgres + PgBouncer
pnpm build          pnpm typecheck         pnpm test
pnpm db:migrate     pnpm db:seed           pnpm db:studio
```
