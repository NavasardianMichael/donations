import {
  BarChart3,
  Blocks,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Mail,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * The primary navigation, exactly the four entries in the final Stitch nav
 * (`manage_pages_desktop_updated_nav`). Shared by the desktop sidebar and the
 * mobile bottom bar so the two can never drift.
 *
 * `labelKey` is a key in the `nav` namespace — no strings here.
 */
export interface NavItem {
  href: string;
  labelKey: "dashboard" | "pages" | "widget" | "analytics";
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/pages", labelKey: "pages", icon: FileText },
  { href: "/widget", labelKey: "widget", icon: Blocks },
  { href: "/analytics", labelKey: "analytics", icon: BarChart3 },
];

/**
 * The footer group of the sidebar, below the rule: account-level destinations
 * and the two support links. Shared with the mobile sheet for the same reason
 * as `NAV_ITEMS` — the two lists drifted the last time they were written twice.
 *
 * `/faq` and `/contact` leave the dashboard for the marketing surface. They are
 * still ordinary links: the shell is a layout, not a shell the user is trapped
 * in, and `isActive` simply never matches while inside `(dashboard)`.
 */
export interface SecondaryNavItem {
  href: string;
  labelKey: "payouts" | "faq" | "contact";
  icon: LucideIcon;
}

export const SECONDARY_NAV_ITEMS: SecondaryNavItem[] = [
  { href: "/settings/payouts", labelKey: "payouts", icon: Wallet },
  { href: "/faq", labelKey: "faq", icon: CircleHelp },
  { href: "/contact", labelKey: "contact", icon: Mail },
];

/** True for the item itself and anything nested under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
