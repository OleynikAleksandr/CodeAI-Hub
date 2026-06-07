import type {
  WorkspaceRuntimeCapsule,
  WorkspaceRuntimePath,
} from "./workspace-runtime-capsule";

export interface WorkspaceRuntimeCapsuleGitignore {
  readonly content: string;
  readonly path: WorkspaceRuntimePath;
}

export const WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT = [
  "# CodeAI Hub workspace runtime capsule",
  "# Runtime execution state is local-only and is recreated from tracked workflow truth.",
  "# Product workflow artifacts live beside runtime/ and remain Git-owned.",
  "",
  "runtime/",
  "",
].join("\n");

export const buildWorkspaceRuntimeCapsuleGitignore = (
  capsule: WorkspaceRuntimeCapsule
): WorkspaceRuntimeCapsuleGitignore => ({
  content: WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
  path: capsule.gitignoreFile,
});
