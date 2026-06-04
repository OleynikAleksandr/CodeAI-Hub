import type {
  WorkspaceRuntimeCapsule,
  WorkspaceRuntimePath,
} from "./workspace-runtime-capsule";

export interface WorkspaceRuntimeCapsuleGitignore {
  readonly content: string;
  readonly path: WorkspaceRuntimePath;
}

const TRACKED_RUNTIME_INTENT = [
  "!runtime/",
  "!runtime/sessions/",
  "!runtime/sessions/unified/",
  "!runtime/providers/",
  "!runtime/providers/**/",
  "!runtime/providers/**/home/",
] as const;

const WORKSPACE_OWNED_MUTABLE_PATTERNS = [
  "runtime/settings/",
  "runtime/localization/",
] as const;

const SECRET_PATTERNS = [
  "runtime/providers/**/home/**/.env",
  "runtime/providers/**/home/**/.env.*",
  "runtime/providers/**/home/**/.netrc",
  "runtime/providers/**/home/**/.npmrc",
  "runtime/providers/**/home/**/auth.json",
  "runtime/providers/**/home/**/credentials.json",
  "runtime/providers/**/home/**/oauth*.json",
  "runtime/providers/**/home/**/token.json",
  "runtime/providers/**/home/**/tokens.json",
  "runtime/providers/**/home/**/secrets.json",
  "runtime/providers/claude/home/.claude.json",
  "runtime/providers/claude/home/.claude/**/auth.json",
  "runtime/providers/codex/home/.codex/auth.json",
  "runtime/providers/gemini/home/.gemini/oauth_creds.json",
  "runtime/providers/gemini/home/.gemini/credentials.json",
  "runtime/providers/kimi/home/.kimi/auth.json",
] as const;

const CACHE_PATTERNS = [
  ".DS_Store",
  "runtime/**/.DS_Store",
  "runtime/providers/**/home/**/.cache/",
  "runtime/providers/**/home/**/.npm/",
  "runtime/providers/**/home/**/.pnpm-store/",
  "runtime/providers/**/home/**/Cache/",
  "runtime/providers/**/home/**/Code Cache/",
  "runtime/providers/**/home/**/GPUCache/",
  "runtime/providers/**/home/**/node_modules/",
  "runtime/providers/**/home/**/tmp/",
  "runtime/providers/**/home/**/*.sqlite",
  "runtime/providers/**/home/**/*.sqlite-shm",
  "runtime/providers/**/home/**/*.sqlite-wal",
  "runtime/providers/**/home/**/*.log",
  "runtime/providers/**/home/**/models_cache.json",
] as const;

export const WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT = [
  "# CodeAI Hub workspace runtime capsule",
  "# Workflow unified sessions and provider-native session histories are Git-owned workflow state.",
  "# Workspace settings and localization runtime remain mutable workspace state.",
  "# Secrets, credentials and caches are intentionally left outside Git.",
  "",
  ...TRACKED_RUNTIME_INTENT,
  "",
  "# Workspace-owned mutable runtime",
  ...WORKSPACE_OWNED_MUTABLE_PATTERNS,
  "",
  "# Provider auth and secrets",
  ...SECRET_PATTERNS,
  "",
  "# Provider caches and noisy local files",
  ...CACHE_PATTERNS,
  "",
].join("\n");

export const buildWorkspaceRuntimeCapsuleGitignore = (
  capsule: WorkspaceRuntimeCapsule
): WorkspaceRuntimeCapsuleGitignore => ({
  content: WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
  path: capsule.gitignoreFile,
});
