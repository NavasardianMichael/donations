<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Նվիրիր (Nvirir)

Multi-tenant donation platform for the ARMENIAN market. Creators publish
donation pages at `/d/[slug]`, embed them via iframe, and track donations and
traffic. The platform takes a 5% fee per transaction. Payments are live through
two providers — see "Two payment providers" below.

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

## Two payment providers

Real money moves. **ArCa** takes Armenian cards in AMD; **Paddle** takes
international cards in USD. The donor picks on the public page. Do not add a
third provider without an explicit request.

- `src/lib/payments/arca.ts` — BPC/RBS "iPay" gateway. Redirect to its hosted
  card page, then confirm with a server-to-server `getOrderStatus`.
- `src/lib/payments/paddle.ts` — Paddle Billing, merchant of record. A
  server-created transaction, an overlay opened by Paddle.js on our own page,
  then a signed webhook. Raw `fetch` + `node:crypto`; there is no server SDK.
- Either provider missing its env keys hides that option instead of failing to
  boot. With neither, the Donate button is disabled and the amount selector
  still renders — it is part of the design.

Rules that are easy to break and expensive to get wrong:

- **A browser is never evidence.** A gateway redirect, a `checkout.completed`
  event and an unverified webhook body all prove only that something happened
  somewhere. A donation becomes `SUCCEEDED` on exactly three paths: ArCa's
  `getOrderStatus`, a signature-verified Paddle webhook, and the reconcile
  sweep. Nowhere else.
- **Read the raw body before parsing it.** `verifyWebhookSignature` hashes the
  exact bytes Paddle sent; `await request.json()` first and every signature
  fails.
- **Anything provider-specific is filtered by `provider`.** `providerOrderId`
  holds an ArCa order id on one row and a `txn_…` on the next. The reconcile
  sweep queries per provider for this reason — handing one gateway the other's
  id fails, and after 24h would mark real payments expired.
- **Paddle cannot settle AMD.** International donations are denominated in USD
  from `DonationPage.suggestedAmountsUsd`, a ladder the creator authors beside
  the AMD one. Nothing in this codebase converts currency or holds an exchange
  rate; the creator's two ladders are the only rate that exists.
- **Never sum `Donation.amountMinor` across rows.** It is USD cents on a Paddle
  row and AMD luma on an ArCa one. Every total sums `pageAmountMinor`, the
  page-currency equivalent frozen at creation. Individual rows still _display_
  `amountMinor` + `currency`, because that is what the donor was charged.
- `src/lib/fees.ts` owns the 5% platform fee. A processor's own fee is a second,
  separate concept — Paddle deducts its cut before payout — and belongs in that
  file if it is ever recorded.
- Amount **bounds are not currency-agnostic**: `100_00` minor units is 100 ֏ but
  $100. Use `amountBounds(currency)`, never the bare AMD constants.
- Payouts to creators are still a placeholder: no provider splits per creator,
  and nothing transfers money. `/settings/payouts` is a complete screen over
  that gap — balances derived from `Donation` rows, a live destination form —
  whose two final actions (save, request) report "not yet" instead of
  persisting. There is no payout table. Do not build onboarding screens, or
  wire either action up, without an explicit request.

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
9. **Nothing in the layout is `position: fixed`.** The dashboard shell is a flex
   row — sidebar, then a workspace column whose single scroll region holds the
   page. No element reserves space for another with padding. Read
   `docs/ui-conventions.md` before writing any positioning, scrolling, height
   or `z-index` CSS; it lists the patterns to avoid and why.
10. **No inline event handlers in JSX.** Name them, type them as the callback
    the component expects, and wrap with `useCallback`. For `Input` that is
    `ChangeEventHandler<HTMLInputElement, HTMLInputElement>`; for `Button`
    `onClick`, `MouseEventHandler<HTMLButtonElement>`; for a `<form>`,
    `SubmitEventHandler<HTMLFormElement>`. Custom UI uses that prop's type
    (`TagInputProps["onChange"]`). Pass a `useState` setter through when the
    signatures already match. Leave arrows in `useEffect` / `startTransition`
    / render `.map()` / `t.rich()` — those are not interactive props.

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
pnpm install        # scripts/setup.mjs: generate, compose up, migrate, seed
pnpm dev            pnpm build             pnpm typecheck    pnpm test
pnpm setup          # re-run the install-time setup on its own
pnpm db:migrate     pnpm db:seed           pnpm db:studio
```

`postinstall` applies migrations, so never tell anyone to run `prisma migrate
deploy` by hand. After changing `schema.prisma`, `pnpm db:migrate` to author the
migration — every other machine picks it up on its next install.
