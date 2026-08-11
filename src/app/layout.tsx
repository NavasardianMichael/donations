import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui";
import { clientEnv } from "@/lib/env";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.appUrl),
  title: {
    default: "GiveDirect — donation pages that convert",
    template: "%s · GiveDirect",
  },
  description:
    "Create a donation page, publish it at your own URL, embed it anywhere. Payouts go straight to your bank. 5% platform fee, no monthly cost.",
  applicationName: "GiveDirect",
  openGraph: {
    type: "website",
    siteName: "GiveDirect",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9f9" },
    { media: "(prefers-color-scheme: dark)", color: "#141616" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-dvh bg-canvas font-sans text-fg antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
