import { Wordmark } from "@/components/brand/wordmark";
import { Card, Text } from "@/components/ui";

/**
 * The shared shell for every auth screen: wordmark, one-line subtitle, then
 * the form. Warm-bordered card on the neutral canvas, per the design.
 */
export function AuthCard({
  subtitle,
  children,
  footer,
}: {
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card tone="warm" className="px-6 py-8 sm:px-8">
      <div className="text-center">
        <Wordmark size="lg" />
        <Text variant="muted" className="mt-2">
          {subtitle}
        </Text>
      </div>

      <div className="mt-7">{children}</div>

      {footer ? (
        <div className="mt-6 text-center text-sm text-muted">{footer}</div>
      ) : null}
    </Card>
  );
}
