import { cn } from "@/lib/utils";

/**
 * Dense, quiet, legible — the dashboard is a financial tool.
 * The wrapper owns horizontal overflow so the page body never scrolls sideways.
 */
export function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentPropsWithRef<"table"> & { containerClassName?: string }) {
  return (
    <div
      className={cn(
        "w-full scrollbar-thin overflow-x-auto",
        containerClassName,
      )}
    >
      <table
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentPropsWithRef<"thead">) {
  return (
    <thead
      className={cn(
        "bg-surface-sunken [&_tr]:border-b [&_tr]:border-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentPropsWithRef<"tbody">) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  );
}

export function TableFooter({
  className,
  ...props
}: React.ComponentPropsWithRef<"tfoot">) {
  return (
    <tfoot
      className={cn(
        "border-t border-subtle bg-surface-sunken font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: React.ComponentPropsWithRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-subtle transition-colors hover:bg-surface-hover data-[state=selected]:bg-accent-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  numeric,
  ...props
}: React.ComponentPropsWithRef<"th"> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 px-4 text-left align-middle text-xs font-semibold tracking-wider whitespace-nowrap text-muted uppercase",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  numeric,
  ...props
}: React.ComponentPropsWithRef<"td"> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-fg",
        numeric && "tabular text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: React.ComponentPropsWithRef<"caption">) {
  return (
    <caption className={cn("mt-4 text-sm text-muted", className)} {...props} />
  );
}
