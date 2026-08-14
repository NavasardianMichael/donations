import localFont from "next/font/local";

/**
 * GHEA Grapalat — Edik Ghabuzyan's Palatino-derived Armenian text face.
 *
 * The family ships only two weights, 400 and 700. Left alone, the browser
 * would synthesise 500 and 600 by smearing the outlines, which looks
 * particularly bad on Armenian letterforms. The `weight` ranges below tell it
 * to snap instead: 100–500 resolves to Regular, 600–900 to Bold. So
 * `font-medium` renders as Regular and `font-semibold` as true Bold, with no
 * faux weights anywhere.
 *
 * Converted from the supplied OTFs to WOFF2 — 848 KB down to 265 KB, and the
 * two upright faces (140 KB) are all a typical page loads.
 */
export const grapalat = localFont({
  src: [
    {
      path: "../fonts/ghea-grapalat-regular.woff2",
      weight: "100 500",
      style: "normal",
    },
    {
      path: "../fonts/ghea-grapalat-bold.woff2",
      weight: "600 900",
      style: "normal",
    },
    {
      path: "../fonts/ghea-grapalat-italic.woff2",
      weight: "100 500",
      style: "italic",
    },
    {
      path: "../fonts/ghea-grapalat-bold-italic.woff2",
      weight: "600 900",
      style: "italic",
    },
  ],
  variable: "--font-grapalat",
  display: "swap",
  // Armenian has no usable system fallback on most machines; a serif stack at
  // least keeps the page from reflowing into something wildly different.
  fallback: ["Georgia", "Cambria", "Times New Roman", "serif"],
  preload: true,
});

/**
 * Davel Aghvor — kept on disk, not applied. One cut only.
 */
export const davelAghvor = localFont({
  src: [
    {
      path: "../fonts/davel-aghvor.otf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-davel-aghvor",
  display: "swap",
  fallback: ["Georgia", "Cambria", "Times New Roman", "serif"],
  preload: false,
});

/**
 * Mardoto — the face in use. Earlier families stay declared so they can be
 * switched back without restoring files.
 *
 * `font-semibold` (600) snaps to Bold rather than a synthesised weight.
 */
export const mardoto = localFont({
  src: [
    { path: "../fonts/mardoto-thin.ttf", weight: "100 200", style: "normal" },
    { path: "../fonts/mardoto-light.ttf", weight: "300", style: "normal" },
    { path: "../fonts/mardoto-regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/mardoto-medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/mardoto-bold.ttf", weight: "600 700", style: "normal" },
    { path: "../fonts/mardoto-black.ttf", weight: "800 900", style: "normal" },
    { path: "../fonts/mardoto-thinitalic.ttf", weight: "100 200", style: "italic" },
    { path: "../fonts/mardoto-lightitalic.ttf", weight: "300", style: "italic" },
    { path: "../fonts/mardoto-italic.ttf", weight: "400", style: "italic" },
    { path: "../fonts/mardoto-mediumitalic.ttf", weight: "500", style: "italic" },
    { path: "../fonts/mardoto-bolditalic.ttf", weight: "600 700", style: "italic" },
    { path: "../fonts/mardoto-blackitalic.ttf", weight: "800 900", style: "italic" },
  ],
  variable: "--font-mardoto",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "sans-serif"],
  preload: true,
});
