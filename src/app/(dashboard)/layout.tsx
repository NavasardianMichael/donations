import { MobileTabBar, MobileTopBar } from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { requireUser } from "@/lib/auth-guards";

/**
 * The authenticated shell: one viewport-tall flex row, sidebar then workspace.
 *
 * Nothing here is positioned — the chrome holds its place because it is a flex
 * sibling of the scroll container, not because it was lifted out of flow. The
 * document itself never scrolls; the single scroll region is the workspace
 * column, so the sidebar and the mobile bars cannot drift and no element needs
 * padding to reserve space for another. See `docs/ui-conventions.md`.
 *
 * `requireUser()` here is convenience, not security: it gets the session for
 * the chrome. Every page and action re-checks independently.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const chromeUser = {
    name: user.name,
    email: user.email,
    image: user.image,
  };

  return (
    <div data-shell="app" className="flex h-dvh overflow-hidden bg-canvas">
      <Sidebar user={chromeUser} />

      {/* `min-h-0 min-w-0` so the column shrinks on both axes; overflow stays
          in the scroll region below instead of growing the document. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <MobileTopBar user={chromeUser} />

        {/* The app's only scroll region. */}
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
          {user.emailVerified ? null : <VerifyEmailBanner email={user.email} />}

          <main className="flex-1">{children}</main>
        </div>

        <MobileTabBar />
      </div>
    </div>
  );
}
