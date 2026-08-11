import { MobileTabBar, MobileTopBar } from "@/components/dashboard/mobile-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { requireUser } from "@/lib/auth-guards";

/**
 * The authenticated shell.
 *
 * Sidebar pushes content from `md` up (`md:pl-sidebar`) rather than overlaying
 * it, per the design spec. Below that the sidebar is replaced by a top bar and
 * a fixed bottom tab bar, so the four primary destinations stay one thumb-tap
 * away — the bottom padding keeps content clear of it.
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
    <div className="min-h-dvh bg-canvas">
      <Sidebar user={chromeUser} />
      <MobileTopBar user={chromeUser} />

      <div className="md:pl-sidebar">
        {user.emailVerified ? null : <VerifyEmailBanner email={user.email} />}

        <main className="pb-24 md:pb-10">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
