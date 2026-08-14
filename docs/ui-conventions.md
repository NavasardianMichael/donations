# UI conventions

Read this before writing layout or positioning CSS. It records decisions that
are already made, so they are not re-litigated per screen. `AGENTS.md` owns the
project-wide rules (money, i18n, the `components/ui` boundary); this file owns
**how things are placed on screen**.

## The app shell is a flex row, and it does not scroll

The authenticated shell in `src/app/(dashboard)/layout.tsx` is one
viewport-tall flex row:

```
<div className="flex h-dvh overflow-hidden">   ← the document never scrolls
  <Sidebar />                                  ← w-sidebar shrink-0, full height
  <div className="flex min-w-0 flex-1 flex-col">
    <MobileTopBar />                           ← shrink-0, in flow
    <div className="min-h-0 flex-1 overflow-y-auto">   ← THE scroll region
      …page…
    </div>
    <MobileTabBar />                           ← shrink-0, in flow
  </div>
</div>
```

Three properties follow from that shape, and each one is the reason to keep it:

- **The chrome holds its place because of the box it is in**, not because it was
  lifted out of flow. Nothing can drift, overlap, or be double-counted.
- **Exactly one element scrolls.** Content scrolls under a stationary sidebar
  without the sidebar knowing it exists.
- **No element reserves space for another.** The `md:pl-sidebar` and `pb-24`
  offsets this replaced were duplicated knowledge: change the sidebar width and
  a padding on an unrelated element silently became wrong.

Marketing and public pages (`(marketing)`, `(public)`) are documents, not an
app. They scroll normally and their header is `sticky top-0` in flow — correct
there, and not a precedent for the dashboard.

## Without a sidebar, `<Container>` sets the measure

The dashboard's content width is a by-product of its shape: the sidebar takes
`w-sidebar` and the workspace column gets what is left. The surfaces with no
sidebar — `(marketing)`, `(public)`, `(auth)` — have nothing playing that role,
so on a wide monitor a form or a paragraph would run the full viewport. They get
their bounds from `Container` in `src/components/ui`, which owns both the gutter
scale (`px-4 sm:px-6 lg:px-10`) and the maximum measure.

**One width per surface, not per page.** The header, the footer and the body all
pass the same `size`, because a header that runs wider than the content beneath
it reads as a misalignment rather than a choice. That is the whole reason the
prop names a surface:

- `size="content"` (default) — `max-w-content`, 64rem. The marketing surface:
  `SiteHeader`, `SiteFooter`, the landing sections, FAQ, contact, legal.
- `size="reading"` — `max-w-reading`, 44rem. The donation surface: the
  `(public)` chrome and the donation page under it. The wordmark tracks the
  donation card's measure — alone in the far corner of a wide screen it read as
  a broken page rather than a minimal one.

Both tokens are declared in `globals.css`; read them through `Container` rather
than writing `max-w-content` by hand, so the gutters travel with the width. A
narrower measure *inside* a container is still fine — `Lead` capped at
`max-w-xl`, a status card at `max-w-md` — because it reads as an element,
not as the page's edge.

Two things follow from where it sits in the tree:

- **A full-bleed background belongs on the `<section>`, the `Container` goes
  inside it.** That is what lets the hero gradient and the sunken band reach the
  viewport edge while their text stops. Put the background on the `Container`
  and it becomes a floating panel.
- **Vertical padding stays on the `Container`'s `className`**, horizontal
  padding never does — the whole point is that one file decides the gutter.

`(auth)` predates this and centres its own `max-w-md` card. That is a
deliberately different measure — a single card, not a page — and it is fine as
it is. `/embed/*` gets no container at all: the host page's iframe is the only
thing entitled to set its width.

## Patterns to avoid

### `position: fixed` for anything in the layout

Fixed elements are removed from flow and positioned against the viewport, so
every neighbour has to be told about them by hand — with padding, a margin, or
a `z-index`. That knowledge lives in the wrong files and rots silently. Fixed
elements also ignore their container: they escape a transformed or contained
ancestor, break inside iframes (`/embed/*`), and on iOS interact badly with
the collapsing URL bar and the on-screen keyboard.

Use a flex or grid sibling instead. If an element should stay visible while
content moves, it belongs **outside** the scroll region, not on top of it.

**The one legitimate use** is an overlay portalled to `<body>` — the dialog and
alert-dialog overlays and the toaster in `src/components/ui`. Those genuinely
belong to the viewport and are already implemented; do not add more.

### Reserving space for a sibling with padding or margin

`pl-sidebar`, `pb-24` to clear a tab bar, `pt-topbar` under a header. Each is a
hard-coded copy of another element's size. Put the two elements in the same
flex container and let the layout do it.

### `100vh` / `h-screen`

`vh` ignores mobile browser chrome, so a "full height" screen is taller than
the visible area on iOS and Android. Use `h-dvh`, and only on the shell root —
inner elements grow with `flex-1`, never with a viewport unit.

### A `sticky` element whose scroll container you have not checked

`sticky` is fine — it stays in flow. But its offsets resolve against the
nearest scrolling ancestor, which in the dashboard is the workspace scroll
region, **not** the viewport. `sticky bottom-4` in a form sticks to the bottom
of the workspace. Also: an ancestor with `overflow: hidden` between the element
and the scroll container silently kills it.

### Inventing `z-index` values

The stack is small on purpose: in-page sticky bars sit at `z-10`, portalled
overlays at `z-50` (owned by `components/ui`). The shell chrome needs no
`z-index` at all, because it does not overlap anything. If a new number seems
necessary, the element is probably positioned when it should not be.

### Scroll-based layout in `/embed/*`

An embed is sized by the host page's iframe. It must never assume a viewport:
no `h-dvh`, no fixed chrome, no internal scroll region. It renders at its
natural height and lets the iframe be as tall as it is.

## When you change the shell

- The scroll container is `overflow-y-auto`, so `overflow-x` becomes `auto` too
  — a wide table scrolls inside the workspace. Keep `min-w-0` on the workspace
  column, or that table stretches the flex row and pushes the sidebar off.
- A flex child that scrolls needs `min-h-0` (column) or `min-w-0` (row).
  Without it the automatic minimum size keeps it at content height and the
  overflow moves to the wrong element.
- Route changes still scroll to the top: Next resets `documentElement.scrollTop`
  and then calls `scrollIntoView()` on the incoming segment, which scrolls
  ancestor scroll containers too. Do not add a manual scroll reset.
