"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { NAV_ITEMS } from "@/components/dashboard/nav-items";
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";

/**
 * The signed-in corner of the public header: an identity badge that doubles as
 * the way into the dashboard.
 *
 * The badge and the disclosure are two separate controls inside one pill. A
 * single control cannot both navigate and open a menu — Radix would open the
 * menu on the same click that follows the link — so the avatar/name half is a
 * plain link to the dashboard and the chevron half is the menu trigger.
 *
 * The menu lists `NAV_ITEMS`, the same four destinations as the dashboard
 * sidebar, from the same source so the two can never drift.
 */
export function HeaderUserMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const t = useTranslations("nav");
  const label = user.name ?? user.email ?? "";

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-subtle bg-surface-sunken p-0.5">
      <Link
        href="/dashboard"
        className="flex min-w-0 items-center gap-2 rounded-full py-0.5 pr-1 pl-0.5 transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Avatar size="xs" name={user.name} src={user.image} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-fg sm:block">
          {label}
        </span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("openMenu")}
            className="flex size-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:bg-surface-active data-[state=open]:text-fg"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-56">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Avatar size="sm" name={user.name} src={user.image} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{label}</p>
              {user.email ? (
                <p className="truncate text-xs text-muted">{user.email}</p>
              ) : null}
            </div>
          </div>

          <DropdownMenuSeparator />

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <Icon aria-hidden="true" />
                  {t(item.labelKey)}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
