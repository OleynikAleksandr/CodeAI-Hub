import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_CODEAI_CLAUDE_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "claude",
  "home"
);

export const resolveClaudeProviderHome = (): string =>
  process.env.CODEAI_CLAUDE_HOME?.trim() || DEFAULT_CODEAI_CLAUDE_HOME;

export const resolveClaudeProviderClaudeDir = (): string =>
  path.join(resolveClaudeProviderHome(), ".claude");

export const resolveClaudeProviderProjectsDir = (): string =>
  path.join(resolveClaudeProviderClaudeDir(), "projects");

export const resolveClaudeProviderProjectDir = (slug: string): string =>
  path.join(resolveClaudeProviderProjectsDir(), slug);
