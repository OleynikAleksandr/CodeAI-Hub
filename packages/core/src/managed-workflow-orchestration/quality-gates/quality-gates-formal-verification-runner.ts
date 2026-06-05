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

const NPM_RUN_SCRIPT_RE =
  /(?:^|[\s;&|()])npm\s+run\s+(?:(?:--silent|--if-present|--foreground-scripts|--ignore-scripts)\s+)*([^\s;&|()]+)/gmu;

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): readonly string[] => {
  const raw = value[key];
  return Array.isArray(raw) && raw.every((entry) => typeof entry === "string")
    ? (raw as readonly string[])
    : [];
};

const toPackageScriptName = (gateId: string): string => {
  if (gateId.startsWith("qg:")) {
    return gateId;
  }
  if (gateId.startsWith("qg-")) {
    return `qg:${gateId.slice("qg-".length)}`;
  }
  return `qg:${gateId}`;
};

const collectHookNpmRunScripts = (hookText: string): readonly string[] => {
  const scripts = new Set<string>();
  for (const match of hookText.matchAll(NPM_RUN_SCRIPT_RE)) {
    const scriptName = match[1]?.trim();
    if (scriptName && scriptName !== "--") {
      scripts.add(scriptName);
    }
  }
  return [...scripts];
};

const collectMissingReferencedHookScripts = (params: {
  readonly hookName: QualityGateHookName;
  readonly hookText: string;
  readonly packageScripts: Record<string, string>;
}): readonly string[] =>
  collectHookNpmRunScripts(params.hookText)
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
  for (const spec of REQUIRED_HOOK_SPECS) {
    const hookText = await readHookText(params.workspaceRoot, spec.hookName);
    const hookScripts = collectHookNpmRunScripts(hookText);
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
      const scriptName = toPackageScriptName(gateId);
      if (packageScripts && !(scriptName in packageScripts)) {
        errors.push(`missing_package_script:${gateId}`);
      }
      if (!hookScripts.includes(scriptName)) {
        errors.push(`missing_hook_gate:${gateId} in .husky/${spec.hookName}`);
      }
    }
  }
  return errors;
};
