/**
 * FAQ structure.
 *
 * The array holds ids and grouping only — every question and answer lives in
 * `messages/hy.json` under `faq.items.<id>`, like all other copy. Ordering and
 * categorisation are content decisions, so they belong in version control
 * rather than in a translation file.
 *
 * `as const satisfies` is load-bearing: it keeps each `id` a string LITERAL
 * while still checking the shape. That makes `t(\`items.${item.id}.question\`)`
 * type-check against the real catalogue, so adding an entry here without
 * adding its copy is a compile error rather than a "⚠️ faq.items.x" at
 * runtime.
 *
 * `id` doubles as the anchor target, so a single answer can be linked
 * directly (`/faq#fees`).
 */

export const FAQ_CATEGORIES = ["general", "pages", "money", "privacy"] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

interface FaqItemShape {
  id: string;
  category: FaqCategory;
  /**
   * Answers describing something not yet available are marked so the page can
   * render them with a caveat instead of quietly implying otherwise.
   */
  notYetAvailable?: boolean;
}

export const FAQ_ITEMS = [
  { id: "what-is-it", category: "general" },
  { id: "who-is-it-for", category: "general" },
  { id: "cost", category: "general" },

  { id: "create-page", category: "pages" },
  { id: "publish", category: "pages" },
  { id: "change-address", category: "pages" },
  { id: "embed", category: "pages" },
  { id: "delete-page", category: "pages" },

  { id: "accept-donations", category: "money", notYetAvailable: true },
  { id: "fees", category: "money" },
  { id: "currency", category: "money" },
  { id: "payouts", category: "money", notYetAvailable: true },

  { id: "analytics-cookies", category: "privacy" },
  { id: "donor-data", category: "privacy" },
] as const satisfies readonly FaqItemShape[];

export type FaqItem = (typeof FAQ_ITEMS)[number];
export type FaqId = FaqItem["id"];

export function faqItemsByCategory(category: FaqCategory): readonly FaqItem[] {
  return FAQ_ITEMS.filter((item) => item.category === category);
}
