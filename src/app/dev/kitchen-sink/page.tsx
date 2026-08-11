import { notFound } from "next/navigation";

import { KitchenSink } from "./kitchen-sink";

export const metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

/**
 * Every component in every variant and state, on one page.
 *
 * Dev-gated: this 404s in production rather than shipping as a public route.
 */
export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitchenSink />;
}
