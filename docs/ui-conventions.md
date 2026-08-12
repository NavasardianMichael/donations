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
