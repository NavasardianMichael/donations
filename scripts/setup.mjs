/**
 * `postinstall` — everything a clone needs before `pnpm dev` will work.
 *
 * The point is that nobody ever types `prisma migrate deploy` by hand:
 *
 *   1. `prisma generate`       the client is generated TypeScript source under
 *                              src/generated/prisma, and gitignored.
 *   2. `.env`                  copied from .env.example when absent, with a real
 *                              AUTH_SECRET generated into it.
 *   3. local Postgres          `docker compose up -d` when the database URL
 *                              points at this machine and nothing answers yet.
 *   4. `prisma migrate deploy` always, against DIRECT_URL.
 *   5. `prisma db seed`        only when the database had no migration history at
 *                              all — a first-ever setup on a local, non-production
 *                              database.
 *
 * Failure policy, because an install that dies is worse than one that warns: a
 * database we could not reach is a warning and exit 0 (CI, Docker image builds, a
 * laptop with Docker switched off). A database we DID reach that then refused a
 * migration is a hard exit 1 — that is schema drift, and swallowing it leaves the
 * app running against a schema that contradicts prisma/migrations.
 *
 * Plain Node, no build step: this runs before anything is compiled. The only
 * import beyond node: builtins is `pg`, and it is lazy.
 *
 * Escape hatches (read from the real environment, not from .env):
 *   SETUP_SKIP=1     do nothing at all
 *   SETUP_DOCKER=0   never start docker compose
 *   SETUP_SEED=0|1   force seeding off / on
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(root, ".env");
const ENV_EXAMPLE = path.join(root, ".env.example");

const step = (msg) => console.log(`[setup] ${msg}`);
const note = (msg) => console.log(`        ${msg}`);
const warn = (msg) => console.log(`[setup] WARNING: ${msg}`);

/** Undefined means "unset — decide for yourself", not false. */
function flag(name) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  return /^(1|true|yes|on)$/i.test(raw);
}

/**
 * Children get node_modules/.bin on PATH. A package manager would have done
 * this, but `node scripts/setup.mjs` is also a supported way in, and the seed
 * command (`tsx prisma/seed.ts`) is spawned by Prisma, not by us — without this
 * it fails to find tsx. The PATH key is looked up case-insensitively because
 * Windows spells it `Path`, and adding a second one wins nothing.
 */
function childEnv() {
  const env = { ...process.env };
  const key =
    Object.keys(env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  env[key] = [path.join(root, "node_modules", ".bin"), env[key]]
    .filter(Boolean)
    .join(path.delimiter);
  return env;
}

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: childEnv(),
  });
  if (result.status !== 0 && !allowFailure) process.exit(result.status ?? 1);
  return result.status === 0;
}

/**
 * Invoke the CLI's entry point with this same Node, rather than the .bin
 * shim: `node_modules/.bin/prisma` is a .CMD on Windows, which Node refuses to
 * spawn without `shell: true`, and shell + argv is both deprecated and a
 * quoting hazard.
 */
const prismaEntry = path.join(
  root,
  "node_modules",
  "prisma",
  JSON.parse(
    readFileSync(
      path.join(root, "node_modules", "prisma", "package.json"),
      "utf8",
    ),
  ).bin.prisma,
);

const prisma = (args, options) =>
  run(process.execPath, [prismaEntry, ...args], options);

/**
 * A deliberately small .env reader. dotenv is a devDependency, so this script
 * must not need it; and it must not mutate process.env either, because the
 * Prisma CLI loads .env itself through prisma.config.ts.
 */
function readEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;
    let value = match[2].trim();
    const quoted =
      value.length > 1 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));
    out[match[1]] = quoted ? value.slice(1, -1) : value;
  }
  return out;
}

/** The real environment wins over the file, exactly as dotenv behaves. */
function resolveEnv() {
  const file = readEnvFile(ENV_FILE);
  const get = (key) => {
    const live = process.env[key];
    return live !== undefined && live !== "" ? live : file[key];
  };
  return { file, get };
}

// ---------------------------------------------------------------------------
// .env
// ---------------------------------------------------------------------------

function ensureEnvFile() {
  if (existsSync(ENV_FILE) || !existsSync(ENV_EXAMPLE)) return;

  const secret = randomBytes(32).toString("base64");
  const contents = readFileSync(ENV_EXAMPLE, "utf8").replace(
    /^AUTH_SECRET=.*$/m,
    `AUTH_SECRET="${secret}"`,
  );
  writeFileSync(ENV_FILE, contents);
  step(".env created from .env.example, with a generated AUTH_SECRET");
  note("optional keys (Google, Resend, ArCa, Paddle) stay empty by design");
}

/**
 * .env.example is the documentation for the environment, so a key added there
 * and missing locally is a real gap — loud, but never fatal: most are optional
 * and the app degrades rather than refusing to boot.
 */
function reportMissingEnvKeys(file) {
  if (!existsSync(ENV_EXAMPLE)) return;
  const missing = Object.keys(readEnvFile(ENV_EXAMPLE)).filter(
    (key) => !(key in file) && !process.env[key],
  );
  if (missing.length === 0) return;
  warn(".env is missing keys that .env.example documents:");
  note(missing.join(", "));
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

function isLocalUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "the configured host";
  }
}

async function pgClient(url) {
  try {
    const { Client } = await import("pg");
    return new Client({
      connectionString: url,
      connectionTimeoutMillis: 4000,
      application_name: "nvirir-setup",
    });
  } catch {
    return null;
  }
}

/**
 * "ok" | "unreachable" | "denied". Only "unreachable" is benign — it means
 * there is nothing to migrate against yet. "denied" is a configuration mistake
 * worth reporting rather than papering over with a docker compose up.
 */
async function probe(url) {
  const client = await pgClient(url);
  if (!client) return "unreachable";
  try {
    await client.connect();
    return "ok";
  } catch (error) {
    const code = error?.code ?? "";
    const network =
      ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH"].includes(
        code,
      ) || /timeout|ECONNRESET|socket hang up/i.test(error?.message ?? "");
    return network ? "unreachable" : "denied";
  } finally {
    await client.end().catch(() => {});
  }
}

/** True when the database already has migration history — i.e. is not brand new. */
async function hasMigrationHistory(url) {
  const client = await pgClient(url);
  if (!client) return true; // Unknown: assume not fresh, so we never seed blind.
  try {
    await client.connect();
    const { rows } = await client.query(
      "select to_regclass('public._prisma_migrations') is not null as present",
    );
    return Boolean(rows[0]?.present);
  } catch {
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

function dockerAvailable() {
  return (
    spawnSync("docker", ["compose", "version"], { cwd: root, stdio: "ignore" })
      .status === 0
  );
}

async function waitForPostgres(url, seconds = 90) {
  const deadline = Date.now() + seconds * 1000;
  for (;;) {
    const state = await probe(url);
    if (state !== "unreachable") return state;
    if (Date.now() > deadline) return "unreachable";
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

/**
 * Bring the compose stack up when the URL is local and nothing answers. Any
 * other host is somebody else's database and we do not touch it.
 */
async function ensureLocalPostgres(url) {
  if (!isLocalUrl(url)) return "unreachable";
  if (flag("SETUP_DOCKER") === false) {
    note("SETUP_DOCKER=0 — not starting docker compose");
    return "unreachable";
  }
  if (!existsSync(path.join(root, "docker-compose.yml"))) return "unreachable";
  if (!dockerAvailable()) {
    warn("Docker is unavailable — start Postgres yourself, then: pnpm setup");
    return "unreachable";
  }

  step("starting local Postgres (docker compose up -d)");
  if (!run("docker", ["compose", "up", "-d"], { allowFailure: true })) {
    warn("docker compose failed — skipping migrations");
    return "unreachable";
  }

  step("waiting for Postgres to accept connections");
  return waitForPostgres(url);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (flag("SETUP_SKIP")) {
  note("SETUP_SKIP is set — skipping setup entirely");
  process.exit(0);
}

if (!existsSync(path.join(root, "node_modules", "prisma"))) {
  // A production or partial install: the CLI that does all of this is a
  // devDependency, so there is nothing to drive.
  warn("the Prisma CLI is not installed (production install?) — skipping");
  process.exit(0);
}

ensureEnvFile();

// The generated client is gitignored, so this runs on every install — nothing
// can typecheck, test or build until @/generated/prisma/client resolves.
step("prisma generate");
prisma(["generate"]);

const { file, get } = resolveEnv();
reportMissingEnvKeys(file);

// Migrations need a direct connection: PgBouncer in transaction pooling mode
// cannot carry the advisory lock and session state they rely on.
const migrationUrl = get("DIRECT_URL") || get("DATABASE_URL");
if (!migrationUrl) {
  warn("no DATABASE_URL / DIRECT_URL — skipping migrations");
  note("set them in .env, then run: pnpm setup");
  process.exit(0);
}

let state = await probe(migrationUrl);
if (state === "unreachable") state = await ensureLocalPostgres(migrationUrl);

if (state === "unreachable") {
  warn(`database unreachable at ${hostOf(migrationUrl)} — nothing migrated`);
  note("run `pnpm setup` once it is up");
  process.exit(0);
}
if (state === "denied") {
  warn(
    "the database refused the connection (credentials, or no such database)",
  );
  note("check DIRECT_URL in .env, then run: pnpm setup");
  process.exit(0);
}

const fresh = !(await hasMigrationHistory(migrationUrl));

step("prisma migrate deploy");
if (!prisma(["migrate", "deploy"], { allowFailure: true })) {
  // We reached the database and it still said no: drift, or a schema created by
  // `db push` instead of by migrations. Exiting 0 here would hand back a broken
  // install that looks fine.
  warn("migrations failed against a reachable database — not skippable");
  note("if this is a local database you can throw away: pnpm db:reset");
  process.exit(1);
}

// Seeding is data, not schema, so it happens once and only where it is safe: a
// database with no prior migration history, on this machine, outside production
// and CI. SETUP_SEED=1 forces it — the seed is idempotent, touching only its own
// two @nvirir.test users.
const shouldSeed =
  flag("SETUP_SEED") ??
  (fresh &&
    isLocalUrl(migrationUrl) &&
    process.env.NODE_ENV !== "production" &&
    !process.env.CI &&
    !process.env.VERCEL);

if (shouldSeed) {
  step("prisma db seed (first setup — sample data for the dashboard)");
  if (prisma(["db", "seed"], { allowFailure: true })) {
    note("sign in as demo@nvirir.test / Password123!");
  } else {
    warn("seeding failed — the schema is fine; run `pnpm db:seed` later");
  }
} else if (fresh) {
  note("the database is empty — `pnpm db:seed` adds sample data");
}

step("ready — pnpm dev");
