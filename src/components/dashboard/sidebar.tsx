"use client";

import { CircleHelp, LogOut, Plus, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { Avatar, Button } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";

import { isActive, NAV_ITEMS } from "./nav-items";

/**
 * The persistent sidebar: `md` and up.
 *
 * A flex child of the shell, full height by virtue of the row it sits in — not
 * pinned. Identity, primary action and the secondary group hold the top and
 * bottom; only the nav list scrolls, so a long list can never push the sign-out
 * control out of reach.
 *
 * Per the design spec it uses a light-grey ground distinct from the white
 * workspace, and marks the active item with a 4px accent pill on the leading
 * edge.
 */
export function Sidebar({
  user,
}: {
  user: { name: string | null; email: string; image: string | null };
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [signingOut, startSignOut] = useTransition();

  return (
    <aside className="hidden w-sidebar min-h-0 shrink-0 flex-col border-r border-subtle bg-canvas-inset md:flex">
      {/* Identity */}
      <div className="flex shrink-0 items-center gap-3 border-b border-subtle px-5 py-5">
        <Avatar size="md" name={user.name} src={user.image} />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-brand">
            {BRAND.name}
          </p>
          <p className="truncate text-xs text-muted">
            {user.name ?? user.email}
          </p>
        </div>
      </div>

      {/* Primary action */}
      <div className="shrink-0 px-4 py-4">
        <Button asChild fullWidth>
          <Link href="/pages/new">
            <Plus />
            {t("createPage")}
          </Link>
        </Button>
      </div>

      {/* Primary navigation */}
      <nav
        aria-label={t("dashboard")}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2"
      >
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-sm py-2.5 pl-4 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active
                      ? "bg-surface-active font-semibold text-fg"
                      : "text-muted hover:bg-surface-hover hover:text-fg",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-1 rounded-full bg-accent"
                    />
                  ) : null}
                  <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Secondary */}
      <div className="shrink-0 space-y-0.5 border-t border-subtle px-2 py-4">
        <Link
          href="/settings/payouts"
          aria-current={
            isActive(pathname, "/settings/payouts") ? "page" : undefined
          }
          className={cn(
            "flex items-center gap-3 rounded-sm py-2.5 pl-4 text-sm transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            isActive(pathname, "/settings/payouts")
              ? "bg-surface-active font-semibold text-fg"
              : "text-muted hover:bg-surface-hover hover:text-fg",
          )}
        >
          <Wallet className="size-4.5 shrink-0" aria-hidden="true" />
          {t("payouts")}
        </Link>

        <Link
          href="/faq"
          className="flex items-center gap-3 rounded-sm py-2.5 pl-4 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <CircleHelp className="size-4.5 shrink-0" aria-hidden="true" />
          {t("helpCenter")}
        </Link>

        <form action={() => startSignOut(() => signOutAction())}>
          <button
            type="submit"
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-sm py-2.5 pl-4 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          >
            <LogOut className="size-4.5 shrink-0" aria-hidden="true" />
            {t("logOut")}
          </button>
        </form>
      </div>
    </aside>
  );
}
