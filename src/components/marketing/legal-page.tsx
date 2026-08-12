import { Heading, Lead, Text } from "@/components/ui";

export interface LegalSection {
  title: string;
  body: string;
}

export function LegalPage({
  title,
  subtitle,
  updated,
  sections,
}: {
  title: string;
  subtitle: string;
  updated?: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-form px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <header>
        <Heading level={1} size="display">
          {title}
        </Heading>
        <Lead className="mt-3">{subtitle}</Lead>
        {updated ? (
          <Text size="sm" variant="muted" className="mt-2">
            {updated}
          </Text>
        ) : null}
      </header>

      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <Heading level={2} size="sm">
              {section.title}
            </Heading>
            <Text
              size="sm"
              variant="muted"
              className="whitespace-pre-line leading-relaxed"
            >
              {section.body}
            </Text>
          </section>
        ))}
      </div>
    </div>
  );
}
