import { Wordmark } from "@/components/brand/wordmark";
import { copyrightLine } from "@/lib/brand";

/**
 * Minimal chrome for the donation surface: a bare header with just the
 * wordmark and a one-line footer. No nav competing with the primary action —
 * the design direction for this surface is explicitly "one job: get someone
 * to complete a donation."
 *
 * No cookies read anywhere in this tree, on purpose — see
 * `HeaderAuthActions` in the marketing header for why that would poison
 * static rendering for every page under this segment.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-subtle bg-surface">
        <div className="mx-auto flex h-14 max-w-content items-center px-4 sm:px-6">
          <Wordmark size="sm" />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-subtle bg-surface">
        <div className="mx-auto max-w-content px-4 py-6 text-center text-xs text-muted sm:px-6">
          {copyrightLine()}
        </div>
      </footer>
    </div>
  );
}
