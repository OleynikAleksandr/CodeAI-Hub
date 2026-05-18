export type KimiWorkspaceOverrideReason =
  | "empty"
  | "started"
  | "unchanged"
  | "updated";

export interface KimiWorkspaceOverrideResult {
  readonly activeWorkspacePath: string | null;
  readonly applied: boolean;
  readonly reason: KimiWorkspaceOverrideReason;
  readonly workspacePath: string | null;
}

interface WorkspaceOverrideReporter {
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

export const reportKimiWorkspaceOverride = (
  reporter: WorkspaceOverrideReporter | undefined,
  override: KimiWorkspaceOverrideResult
): void => {
  if (override.reason === "empty") {
    return;
  }
  if (override.reason === "started") {
    reporter?.warn?.(
      "Kimi session workspace override ignored after Wire startup",
      {
        activeWorkspacePath: override.activeWorkspacePath,
        workspacePath: override.workspacePath,
      }
    );
    return;
  }
  reporter?.info?.("Kimi session workspace override", {
    applied: override.applied,
    reason: override.reason,
    workspacePath: override.workspacePath,
  });
};

export class KimiWorkspaceOverrideState {
  private activeWorkspacePath: string | null;
  private runtimeStarted = false;

  constructor(workspacePath: string | undefined) {
    this.activeWorkspacePath = workspacePath ?? null;
  }

  getActiveWorkspacePath(): string | null {
    return this.activeWorkspacePath;
  }

  markRuntimeStarted(): void {
    this.runtimeStarted = true;
  }

  resolve(workspacePath: string | undefined): KimiWorkspaceOverrideResult {
    const normalizedWorkspacePath = workspacePath?.trim() ?? "";
    if (normalizedWorkspacePath.length === 0) {
      return this.createResult("empty", false, null);
    }
    if (normalizedWorkspacePath === this.activeWorkspacePath) {
      return this.createResult("unchanged", false, normalizedWorkspacePath);
    }
    if (this.runtimeStarted) {
      return this.createResult("started", false, normalizedWorkspacePath);
    }
    this.activeWorkspacePath = normalizedWorkspacePath;
    return this.createResult("updated", true, normalizedWorkspacePath);
  }

  private createResult(
    reason: KimiWorkspaceOverrideReason,
    applied: boolean,
    workspacePath: string | null
  ): KimiWorkspaceOverrideResult {
    return {
      activeWorkspacePath: this.activeWorkspacePath,
      applied,
      reason,
      workspacePath,
    };
  }
}
