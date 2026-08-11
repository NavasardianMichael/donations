import Link from "next/link";

/**
 * Centred card, no app chrome. Matches the Stitch auth screens: the card is
 * the only thing on a neutral canvas, with a copyright line beneath it.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-10">
      <main className="w-full max-w-md">{children}</main>

      <footer className="mt-6 text-center text-xs text-muted">
        <p>
          © {new Date().getFullYear()} GiveDirect. Empowering creators
          everywhere.
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-3">
          <Link href="/faq" className="hover:text-brand hover:underline">
            FAQ
          </Link>
          <Link href="/contact" className="hover:text-brand hover:underline">
            Contact
          </Link>
          <Link
            href="/donation-terms"
            className="hover:text-brand hover:underline"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
