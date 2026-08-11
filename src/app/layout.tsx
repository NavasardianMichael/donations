import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import type { Metadata, Viewport } from "next";

import { ThemeProvider } from "@/components/theme-provider";
import { AppUiLabels } from "@/components/ui-labels-provider";
import { Toaster } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { clientEnv } from "@/lib/env";
import { grapalat } from "@/lib/fonts";
import { clientMessages } from "@/i18n/client-messages";
import { HTML_LANG, OG_LOCALE, type AppLocale } from "@/i18n/config";

import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("footer");
  const locale = (await getLocale()) as AppLocale;

  return {
    metadataBase: new URL(clientEnv.appUrl),
    title: {
      default: `${BRAND.name} — ${t("tagline")}`,
      template: `%s · ${BRAND.name}`,
    },
    description:
      "Ստեղծեք նվիրատվության էջ, հրապարակեք այն ձեր հասցեով և ներդրեք ցանկացած կայքում։",
    applicationName: BRAND.name,
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      locale: OG_LOCALE[locale],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f9" },
    { media: "(prefers-color-scheme: dark)", color: "#141616" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await getLocale()) as AppLocale;
  const messages = await getMessages();

  return (
    <html
      lang={HTML_LANG[locale]}
      suppressHydrationWarning
      className={grapalat.variable}
    >
      <body className="min-h-dvh bg-canvas font-sans text-fg antialiased">
        <NextIntlClientProvider messages={clientMessages(messages)}>
          <AppUiLabels>
            <ThemeProvider>
              {children}
              <Toaster />
            </ThemeProvider>
          </AppUiLabels>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
