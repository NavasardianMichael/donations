import type messages from "../../messages/hy.json";

type Messages = typeof messages;
type Namespace = keyof Messages;

/**
 * Which namespaces reach the browser.
 *
 * `NextIntlClientProvider` serialises whatever it is given into the HTML, and
 * with no `messages` prop that is the entire catalogue — 26 KB raw on every
 * page, most of it strings no client component will ever read.
 *
 * Namespaces used only by Server Components and Server Actions are excluded
 * here. `email` is the clearest case: templates are rendered on the server and
 * their copy has no business in a browser payload.
 *
 * When the public donation page is built it should narrow this further with
 * its own provider — an anonymous donor does not need the dashboard's strings,
 * and that route is the SEO-critical one.
 */
const SERVER_ONLY: Namespace[] = ["email"];

export function clientMessages(all: Messages): Partial<Messages> {
  const picked = { ...all };
  for (const namespace of SERVER_ONLY) delete picked[namespace];
  return picked;
}

/**
 * Build a provider payload containing only the listed namespaces. For routes
 * that know exactly what they need.
 */
export function pickMessages<K extends Namespace>(
  all: Messages,
  namespaces: readonly K[],
): Pick<Messages, K> {
  const picked = {} as Pick<Messages, K>;
  for (const namespace of namespaces) picked[namespace] = all[namespace];
  return picked;
}
