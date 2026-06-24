import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_CODEAI_CLAUDE_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "claude",
  "home"
);
const WORKSPACE_FALLBACK_SLUG = "workspace";

type EnvironmentMap = Readonly<Record<string, string | undefined>>;

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") || WORKSPACE_FALLBACK_SLUG;
};

const resolveWorkspaceClaudeHome = (workspaceRoot: string): string =>
  path.join(
    workspaceRoot,
    ".codeai-hub",
    normalizeWorkspaceRuntimeSlug(path.basename(workspaceRoot)),
    "runtime",
    "providers",
    "claude",
    "home"
  );

export const resolveClaudeProviderHome = (
  environment: EnvironmentMap = process.env
): string => {
  const explicitHome = environment.CODEAI_CLAUDE_HOME?.trim();
  if (explicitHome) {
    return explicitHome;
  }

  const workspaceRoot =
    environment.CLAUDE_WORKSPACE_PATH?.trim() ||
    environment.CODEX_WORKSPACE_PATH?.trim();
  if (workspaceRoot) {
    return resolveWorkspaceClaudeHome(path.resolve(workspaceRoot));
  }

  return DEFAULT_CODEAI_CLAUDE_HOME;
};

export const resolveClaudeProviderClaudeDir = (): string =>
  path.join(resolveClaudeProviderHome(), ".claude");

export const resolveClaudeProviderProjectsDir = (): string =>
  path.join(resolveClaudeProviderClaudeDir(), "projects");

export const resolveClaudeProviderProjectDir = (slug: string): string =>
  path.join(resolveClaudeProviderProjectsDir(), slug);
