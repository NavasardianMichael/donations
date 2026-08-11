import type { Metadata } from "next";

import { Card, CardContent, Heading, Lead, Text } from "@/components/ui";
import { requireUser } from "@/lib/auth-guards";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Placeholder. The real overview — stat tiles, recent supporters, per-page
 * breakdown — is built in the next phase against the Stitch designs.
 *
 * `requireUser()` is the real guard. proxy.ts only decided the URL should
 * render; this is what actually refuses to serve data to a stranger.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6 lg:px-10">
      <Heading level={1} size="display">
        Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </Heading>
      <Lead className="mt-2">Here&apos;s a quick overview of your impact.</Lead>

      <Card className="mt-8">
        <CardContent>
          <Text size="sm" variant="muted">
            Signed in as{" "}
            <span className="font-medium text-fg">{user.email}</span> ·{" "}
            {user.emailVerified ? "email confirmed" : "email not confirmed"}
          </Text>
        </CardContent>
      </Card>
    </div>
  );
}
