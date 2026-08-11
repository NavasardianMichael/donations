/**
 * The shared UI library.
 *
 * This folder is a self-contained library: it imports from `@/lib/utils` and
 * nothing else in the app. No `@/app`, no `@/server`, no domain models. That
 * constraint — not the folder location — is what makes it liftable into its
 * own package if a second consumer ever appears.
 */

export * from "./accordion";
export * from "./alert";
export * from "./alert-dialog";
export * from "./amount-selector";
export * from "./avatar";
export * from "./badge";
export * from "./button";
export * from "./card";
export * from "./checkbox";
export * from "./copy-button";
export * from "./dialog";
export * from "./dropdown-menu";
export * from "./empty-state";
export * from "./field";
export * from "./input";
export * from "./labels";
export * from "./pagination";
export * from "./popover";
export * from "./progress-bar";
export * from "./radio-group";
export * from "./select";
export * from "./separator";
export * from "./skeleton";
export * from "./slider";
export * from "./spinner";
export * from "./stat";
export * from "./switch";
export * from "./table";
export * from "./tabs";
export * from "./toast";
export * from "./tooltip";
export * from "./typography";
