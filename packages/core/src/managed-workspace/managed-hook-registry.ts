import type { ManagedWorkspaceHookName } from "./managed-workspace-types";

export interface ManagedQualityGateCommand {
  readonly availability:
    | "executable"
    | "needs_user_decision"
    | "not_integrated"
    | "unavailable";
  readonly desiredStatus: "active" | "advisory" | "deferred" | "planned";
  readonly id: string;
  readonly proposedCommand: string;
}

export interface ManagedQualityGateManifest {
  readonly commands: Record<string, ManagedQualityGateCommand>;
  readonly plannedRequiredAfterIntegration?: readonly string[];
  readonly requiredBeforeCommit?: readonly string[];
  readonly requiredBeforePush?: readonly string[];
}

export interface ManagedHookRegistryValidation {
  readonly issues: readonly string[];
  readonly ok: boolean;
}

export type ManagedHookRegistrySections = Readonly<
  Partial<Record<ManagedWorkspaceHookName, string>>
>;

const HOOK_SECTION_START = "# codeai-managed:gates:start";
const HOOK_SECTION_END = "# codeai-managed:gates:end";

export const extractManagedHookSection = (hookText: string): string | null => {
  const startIndex = hookText.indexOf(HOOK_SECTION_START);
  const endIndex = hookText.indexOf(HOOK_SECTION_END);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return null;
  }
  return hookText
    .slice(startIndex + HOOK_SECTION_START.length, endIndex)
    .trim();
};
const BASELINE_HOOK_COMMANDS: Readonly<
  Partial<Record<ManagedWorkspaceHookName, readonly string[]>>
> = {
  "pre-commit": ["node scripts/plan-orchestrator/plan-cli.mjs validate"],
  "pre-push": ["node scripts/plan-orchestrator/plan-cli.mjs validate"],
};

export const validateManagedQualityGateManifest = (
  manifest: ManagedQualityGateManifest
): ManagedHookRegistryValidation => {
  const issues: string[] = [];
  const requiredIds = [
    ...(manifest.requiredBeforeCommit ?? []),
    ...(manifest.requiredBeforePush ?? []),
  ];
  for (const id of requiredIds) {
    const command = manifest.commands[id];
    if (!command) {
      issues.push(`Missing command for required gate ${id}`);
      continue;
    }
    if (
      command.desiredStatus !== "active" ||
      command.availability !== "executable"
    ) {
      issues.push(`Required gate ${id} must be active and executable`);
    }
  }

  const requiredSet = new Set(requiredIds);
  for (const id of manifest.plannedRequiredAfterIntegration ?? []) {
    if (requiredSet.has(id)) {
      issues.push(
        `plannedRequiredAfterIntegration duplicates active required gate ${id}`
      );
    }
  }

  return { issues, ok: issues.length === 0 };
};

export const renderManagedHookRegistrySections = (
  manifest: ManagedQualityGateManifest
): ManagedHookRegistrySections => {
  const validation = validateManagedQualityGateManifest(manifest);
  if (!validation.ok) {
    throw new Error(validation.issues.join("; "));
  }
  return {
    "pre-commit": renderHookSection([
      ...(BASELINE_HOOK_COMMANDS["pre-commit"] ?? []),
      ...commandsForIds(manifest, manifest.requiredBeforeCommit ?? []),
    ]),
    "pre-push": renderHookSection([
      ...(BASELINE_HOOK_COMMANDS["pre-push"] ?? []),
      ...commandsForIds(manifest, manifest.requiredBeforePush ?? []),
    ]),
  };
};

const commandsForIds = (
  manifest: ManagedQualityGateManifest,
  ids: readonly string[]
): readonly string[] =>
  ids.map((id) => manifest.commands[id]?.proposedCommand ?? "");

const renderHookSection = (commands: readonly string[]): string =>
  `${HOOK_SECTION_START}
${commands.filter(Boolean).join("\n")}
${HOOK_SECTION_END}
`;
