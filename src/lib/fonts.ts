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
