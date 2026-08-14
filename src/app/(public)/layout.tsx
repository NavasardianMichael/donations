import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui";
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
      {/* Chrome and page share one measure, so the wordmark sits over the
          donation card's left edge instead of in the far corner of a wide
          screen. See `Container` and docs/ui-conventions.md. */}
      <header className="border-b border-subtle bg-surface">
        <Container size="reading" className="flex h-14 items-center">
          <Wordmark size="sm" />
        </Container>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-subtle bg-surface">
        <Container
          size="reading"
          className="py-6 text-center text-xs text-muted"
        >
          {copyrightLine()}
        </Container>
      </footer>
    </div>
  );
}
