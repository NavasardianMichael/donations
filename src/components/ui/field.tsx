"use client";

import { createContext, useContext, useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Field owns label / description / error / required-marker and generates the
 * IDs that wire `aria-describedby` and `aria-invalid`. No screen should ever
 * have to thread those by hand.
 *
 *   <Field label="Meta title" description="50–60 characters" error={errors.x}>
 *     <Input />
 *   </Field>
 */
interface FieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
  hasDescription: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Props an input needs in order to be correctly labelled. Inputs call this and
 * spread the result; outside a Field it returns nothing, so inputs still work
 * standalone.
 */
export function useFieldControl(): {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
  disabled?: boolean;
} {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};

  const describedBy =
    [ctx.hasDescription && ctx.descriptionId, ctx.hasError && ctx.errorId]
      .filter(Boolean)
      .join(" ") || undefined;

  return {
    id: ctx.id,
    "aria-describedby": describedBy,
    "aria-invalid": ctx.hasError || undefined,
    "aria-required": ctx.required || undefined,
    disabled: ctx.disabled || undefined,
  };
}

export interface FieldProps extends React.ComponentPropsWithoutRef<"div"> {
  /** Widened because the wrapper is a <div> or a <fieldset> depending on props. */
  ref?: React.Ref<HTMLElement>;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  /** Right-aligned slot on the label row — character counters, "Forgot password?". */
  hint?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /**
   * Checkboxes and switches sit before their label rather than under it.
   */
  orientation?: "vertical" | "horizontal";
  /** Set when the control is not a native form element (e.g. a RadioGroup). */
  asFieldset?: boolean;
}

export function Field({
  label,
  description,
  error,
  hint,
  required = false,
  disabled = false,
  orientation = "vertical",
  asFieldset = false,
  className,
  children,
  ref,
  ...props
}: FieldProps) {
  const generated = useId();
  const id = `field-${generated}`;

  const ctx: FieldContextValue = {
    id,
    descriptionId: `${id}-description`,
    errorId: `${id}-error`,
    hasError: Boolean(error),
    hasDescription: Boolean(description),
    required,
    disabled,
  };

  // A RadioGroup/Slider needs <fieldset>/<legend> to be labelled correctly;
  // everything else uses <div> + <label htmlFor>.
  const labelText = (
    <>
      {label}
      {required ? (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </>
  );

  const labelClassName = cn(
    "text-sm font-medium text-fg",
    disabled && "opacity-60",
    orientation === "horizontal" && "cursor-pointer",
  );

  const labelNode = label ? (
    asFieldset ? (
      <legend className={labelClassName}>{labelText}</legend>
    ) : (
      <label htmlFor={id} className={labelClassName}>
        {labelText}
      </label>
    )
  ) : null;

  const wrapperClassName = cn(
    orientation === "horizontal"
      ? "flex items-start gap-3"
      : "flex flex-col gap-1.5",
    className,
  );

  const body = (
    <>
      {orientation === "horizontal" ? (
        <>
          <div className="pt-0.5">{children}</div>
          <div className="flex flex-col gap-0.5">
            {labelNode}
            {description ? (
              <p id={ctx.descriptionId} className="text-xs text-muted">
                {description}
              </p>
            ) : null}
            {error ? (
              <p
                id={ctx.errorId}
                role="alert"
                className="text-xs font-medium text-danger"
              >
                {error}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          {label || hint ? (
            <div className="flex items-baseline justify-between gap-3">
              {labelNode}
              {hint ? <span className="text-xs text-muted">{hint}</span> : null}
            </div>
          ) : null}
          {children}
          {description && !error ? (
            <p id={ctx.descriptionId} className="text-xs text-muted">
              {description}
            </p>
          ) : null}
          {error ? (
            <p
              id={ctx.errorId}
              role="alert"
              className="text-xs font-medium text-danger"
            >
              {error}
            </p>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <FieldContext.Provider value={ctx}>
      {asFieldset ? (
        <fieldset
          className={wrapperClassName}
          {...(props as React.ComponentPropsWithoutRef<"fieldset">)}
          ref={ref as React.Ref<HTMLFieldSetElement>}
        >
          {body}
        </fieldset>
      ) : (
        <div
          className={wrapperClassName}
          {...props}
          ref={ref as React.Ref<HTMLDivElement>}
        >
          {body}
        </div>
      )}
    </FieldContext.Provider>
  );
}
