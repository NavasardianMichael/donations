"use client";

import { CircleHelp, LogOut, Menu, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Avatar,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/server/actions/auth";

import { isActive, NAV_ITEMS } from "./nav-items";

/**
 * Mobile chrome, below `md`: a slim top bar with the wordmark and an overflow
 * sheet, plus the bottom tab bar from `manage_pages_mobile_updated_nav`.
 *
 * The four primary destinations live in the tab bar where thumbs can reach
 * them; everything secondary goes in the sheet.
 *
 * Both bars are in-flow flex children of the shell column, above and below its
 * scroll region — they stay put without `fixed`/`sticky`, and so the content
 * needs no padding to avoid them.
 */
export function MobileTopBar({
  user,
}: {
  user: { name: string | null; email: string; image: string | null };
}) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  return (
    <header className="flex h-topbar shrink-0 items-center justify-between border-b border-subtle bg-surface px-4 md:hidden">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("openMenu")}>
            <Menu />
          </Button>
        </DialogTrigger>

        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{BRAND.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-1">
            <div className="mb-3 flex items-center gap-3 rounded-sm bg-surface-sunken p-3">
              <Avatar size="sm" name={user.name} src={user.image} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">
                  {user.name ?? user.email}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>

            <Link
              href="/settings/payouts"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-fg hover:bg-surface-hover"
            >
              <Wallet className="size-4.5 text-muted" aria-hidden="true" />
              {t("payouts")}
            </Link>

            <Link
              href="/faq"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-fg hover:bg-surface-hover"
            >
              <CircleHelp className="size-4.5 text-muted" aria-hidden="true" />
              {t("helpCenter")}
            </Link>

            <form action={() => startSignOut(() => signOutAction())}>
              <button
                type="submit"
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-fg hover:bg-surface-hover disabled:opacity-50"
              >
                <LogOut className="size-4.5 text-muted" aria-hidden="true" />
                {t("logOut")}
              </button>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <span className="text-lg font-bold text-brand">{BRAND.name}</span>

      <Avatar size="sm" name={user.name} src={user.image} />
    </header>
  );
}

export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("dashboard")}
      className="shrink-0 border-t border-subtle bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1 py-2.5 text-center text-[0.6875rem] leading-tight transition-colors",
                  active ? "font-semibold text-fg" : "text-muted hover:text-fg",
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent"
                  />
                ) : null}
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-2">{t(item.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
