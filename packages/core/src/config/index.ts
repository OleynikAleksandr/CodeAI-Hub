import path from "node:path";

export type CoreConfig = {
  readonly host: string;
  readonly port: number;
  readonly shutdownGracePeriodMs: number;
  readonly claudeWorkspacePath: string;
  readonly claudeProjectSlug: string;
};

const DEFAULT_PORT = 8080;
const DEFAULT_GRACE_MS = 60_000;
const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]/g;
const MULTIPLE_DASHES_REGEX = /-+/g;
const TRAILING_DASH_REGEX = /-$/;

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
};

const sanitizeSlug = (input: string): string =>
  input
    .replace(NON_ALPHANUMERIC_REGEX, "-")
    .replace(MULTIPLE_DASHES_REGEX, "-")
    .replace(TRAILING_DASH_REGEX, "")
    .trim() || "default-workspace";

export const loadConfig = (): CoreConfig => {
  const host = process.env.CORE_HOST ?? "127.0.0.1";
  const port = toNumber(process.env.CORE_PORT, DEFAULT_PORT);
  const shutdownGracePeriodMs = toNumber(
    process.env.CORE_SHUTDOWN_GRACE_MS,
    DEFAULT_GRACE_MS
  );
  const workspacePath =
    process.env.CLAUDE_WORKSPACE_PATH ?? path.resolve(process.cwd());
  const slug =
    process.env.CLAUDE_PROJECT_SLUG ??
    sanitizeSlug(workspacePath.replace(/[^a-zA-Z0-9]/g, "-"));

  return {
    host,
    port,
    shutdownGracePeriodMs,
    claudeWorkspacePath: workspacePath,
    claudeProjectSlug: slug,
  };
};
