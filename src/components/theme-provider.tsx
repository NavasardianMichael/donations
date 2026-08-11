"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Client providers mounted once in the root layout.
 *
 * `SessionProvider` is here for `useSession().update()`, which the
 * email-verification banner calls to refresh the JWT without a re-login. It
 * does not fetch until something actually consumes the context, so pages with
 * no client session usage pay nothing for it.
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
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
}
