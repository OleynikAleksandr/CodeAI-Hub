import {
  collectNpmRunScripts,
  evaluateGateCommandReachability,
  readGateCommand,
} from "./quality-gates-command-reachability";
import {
  readHookText,
  readPackageScripts,
} from "./quality-gates-workspace-files";

const REQUIRED_HOOK_SPECS = [
  {
    contractKey: "requiredBeforeCommit",
    hookName: "pre-commit",
  },
  {
    contractKey: "requiredBeforePush",
    hookName: "pre-push",
  },
] as const;

type QualityGateHookName = (typeof REQUIRED_HOOK_SPECS)[number]["hookName"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): readonly string[] => {
  const raw = value[key];
  return Array.isArray(raw) && raw.every((entry) => typeof entry === "string")
    ? (raw as readonly string[])
    : [];
};

const collectMissingReferencedHookScripts = (params: {
  readonly hookName: QualityGateHookName;
  readonly hookText: string;
  readonly packageScripts: Record<string, string>;
}): readonly string[] =>
  collectNpmRunScripts(params.hookText)
    .filter((scriptName) => !(scriptName in params.packageScripts))
    .map(
      (scriptName) =>
        `missing_hook_package_script:.husky/${params.hookName}:${scriptName}`
    );

export const collectQualityGatesHookCommandDiagnostics = async (params: {
  readonly contract: Record<string, unknown>;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const errors: string[] = [];
  const packageScripts = await readPackageScripts(params.workspaceRoot);
  if (!packageScripts) {
    errors.push("missing_package_json");
  }
  const commands = isRecord(params.contract.commands)
    ? params.contract.commands
    : {};
  for (const spec of REQUIRED_HOOK_SPECS) {
    const hookText = await readHookText(params.workspaceRoot, spec.hookName);
    if (packageScripts) {
      errors.push(
        ...collectMissingReferencedHookScripts({
          hookName: spec.hookName,
          hookText,
          packageScripts,
        })
      );
    }
    for (const gateId of readStringArray(params.contract, spec.contractKey)) {
      const command = readGateCommand(commands, gateId);
      if (!command) {
        errors.push(`gate_command_missing:${gateId}`);
        continue;
      }
      const reachability = evaluateGateCommandReachability({
        command,
        hookText,
        packageScripts: packageScripts ?? {},
      });
      if (reachability.unresolvedScripts.length > 0) {
        errors.push(`gate_command_unresolved:${gateId}:${command}`);
        continue;
      }
      if (!reachability.reachableFromHook) {
        errors.push(
          `gate_command_not_reachable:${gateId}:${command} in .husky/${spec.hookName}`
        );
      }
    }
  }
  return errors;
};
