/**
 * Bare layout: no header, no footer, no nav. This route is loaded as the
 * document inside a third-party `<iframe>`, so anything beyond the donation
 * card itself is the host site's chrome to provide, not ours.
 *
 * The inline `<style>` forcing a transparent body is safe specifically
 * because every hit on this route is a fresh, standalone document load (an
 * iframe navigation), never a client-side transition from elsewhere in this
 * app — so it can never leak onto an unrelated page.
 *
 * Frame permission is granted per page via CSP `frame-ancestors`, set in
 * `proxy.ts` from the creator's allowlist — never as a global header.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-transparent p-3">
      <style>{"html,body{background:transparent}"}</style>
      {children}
    </div>
  );
}
