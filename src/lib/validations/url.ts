import { z } from "zod";

import { isSafeHttpUrl } from "@/lib/utils";

import type { MessageResolver } from "./resolver";

/**
 * Optional http(s) URL. Empty is allowed. `javascript:` and `data:` are not —
 * Zod's `.url()` accepts those, and they must never land in `<img src>`.
 */
/** Browser URL bars accept more; this is an attribute, not a search box. */
const URL_MAX = 2048;

export const httpUrlSchema = (t: MessageResolver) =>
  z
    .string()
    .trim()
    .max(URL_MAX, t("url.tooLong"))
    .refine((value) => value === "" || isSafeHttpUrl(value), t("url.invalid"));
