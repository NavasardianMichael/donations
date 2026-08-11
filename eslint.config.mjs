import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),

  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /**
   * The UI library must stay self-contained. It may import `@/lib/utils` and
   * nothing else from the app — that zero-coupling rule is what lets the
   * folder lift out into its own package later.
   */
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/app/*",
                "@/server/*",
                "@/generated/*",
                "@/components/dashboard/*",
                "@/components/donation/*",
                "@/components/marketing/*",
                "@/lib/*",
                "!@/lib/utils",
              ],
              message:
                "components/ui is a self-contained library: only @/lib/utils may be imported from app code.",
            },
          ],
        },
      ],
    },
  },

  /**
   * Server-only modules must never leak into a client bundle. Enforced by the
   * `server-only` package at build time; this catches it at lint time too.
   */
  {
    files: ["src/server/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ui", "@/components/ui/*"],
              message:
                "Server code should not import UI components. Return data instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
