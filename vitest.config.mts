import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * `pnpm test`    — pure unit tests. No database, no network, fast.
 * `pnpm test:db` — adds *.integration.test.ts, which need a live Postgres
 *                  (`docker compose up -d && pnpm db:deploy`).
 *
 * Selected with Vite's `--mode` rather than an env var so the script works
 * identically in PowerShell, cmd and POSIX shells.
 */
export default defineConfig(({ mode }) => {
  const withDatabase = mode === "db";

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        /**
         * `server-only` throws unless the bundler picks its `react-server`
         * export condition, which Vitest does not. The guard is a build-time
         * concern; under test these modules are already running in Node.
         */
        "server-only": fileURLToPath(
          new URL("./test/stubs/server-only.ts", import.meta.url),
        ),
      },
    },
    test: {
      environment: "node",
      setupFiles: ["./vitest.setup.ts"],
      include: withDatabase
        ? ["src/**/*.integration.test.ts"]
        : ["src/**/*.test.ts", "src/**/*.test.tsx"],
      exclude: [
        "**/node_modules/**",
        ...(withDatabase ? [] : ["**/*.integration.test.ts"]),
      ],
      // Integration tests share one database; running files in parallel would
      // have them delete each other's fixtures.
      fileParallelism: !withDatabase,
    },
  };
});
