import {
  BarChart3,
  Blocks,
  FileText,
  LayoutDashboard,
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

/** True for the item itself and anything nested under it. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
