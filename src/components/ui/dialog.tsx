"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

import { useUiLabels } from "./labels";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps extends React.ComponentPropsWithRef<
  typeof DialogPrimitive.Content
> {
  size?: "sm" | "md" | "lg";
  /** Hide the built-in close button when the content supplies its own. */
  hideClose?: boolean;
}

function DialogContent({
  className,
  children,
  size = "md",
  hideClose = false,
  ...props
}: DialogContentProps) {
  const labels = useUiLabels();

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden bg-surface shadow-overlay",
          // Bottom sheet on phones, centred modal from `sm` up.
          "bottom-0 left-1/2 -translate-x-1/2 rounded-t-lg",
          "sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-sm",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className={cn(
              "absolute top-3 right-3 rounded-xs p-1.5 text-muted transition-colors",
              "hover:bg-surface-hover hover:text-fg",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            )}
          >
            <X className="size-4" />
            <span className="sr-only">{labels.close}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  bordered = true,
  ...props
}: React.ComponentPropsWithRef<"div"> & { bordered?: boolean }) {
  return (
    <div
      className={cn(
        "space-y-1.5 px-6 py-5",
        bordered && "border-b border-subtle",
        className,
      )}
      {...props}
    />
  );
}

function DialogBody({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "flex-1 scrollbar-thin overflow-y-auto px-6 py-5",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-subtle px-6 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-xl font-bold tracking-[-0.01em] text-fg sm:text-2xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-pretty text-muted", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
