"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui";

/**
 * Client providers mounted once in the root layout.
 *
 * `SessionProvider` is here for `useSession().update()`, which the
 * email-verification banner calls to refresh the JWT without a re-login. It
 * does not fetch until something actually consumes the context, so pages with
 * no client session usage pay nothing for it.
 *
 * `TooltipProvider` is global because Radix throws if a `Tooltip` renders
 * without one, and tooltips appear in shared components (icon-only buttons in
 * the page list, for instance) that cannot know what wraps them. A single
 * provider also shares the open-delay timer, so moving between adjacent
 * tooltips does not re-trigger the delay.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </NextThemesProvider>
    </SessionProvider>
  );
}
