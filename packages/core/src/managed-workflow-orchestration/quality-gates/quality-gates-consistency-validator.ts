import { stat } from "node:fs/promises";
import path from "node:path";
import {
  readHookText,
  readPackageScripts,
} from "./quality-gates-workspace-files";

const REQUIRED_ARRAY_KEYS = [
  "requiredBeforeCommit",
  "requiredBeforeModuleExecution",
  "requiredBeforePush",
  "requiredBeforeRelease",
] as const;
const NON_BLOCKING_ARRAY_KEYS = [
  "advisory",
  "deferred",
  "plannedRequiredAfterIntegration",
] as const;
const REGEXP_SPECIAL_RE = /[.*+?^${}()|[\]\\]/gu;

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

const toPackageScriptName = (gateId: string): string => {
  if (gateId.startsWith("qg:")) {
    return gateId;
  }
  if (gateId.startsWith("qg-")) {
    return `qg:${gateId.slice("qg-".length)}`;
  }
  return `qg:${gateId}`;
};

const collectNonBlockingGateIds = (
  contract: Record<string, unknown>
): ReadonlySet<string> => {
  const gateIds = new Set<string>();
  for (const key of NON_BLOCKING_ARRAY_KEYS) {
    for (const gateId of readStringArray(contract, key)) {
      gateIds.add(gateId);
    }
  }
  return gateIds;
};

const collectRequiredGateIds = (
  contract: Record<string, unknown>
): readonly string[] => {
  const nonBlockingGateIds = collectNonBlockingGateIds(contract);
  const requiredGateIds = new Set<string>();
  for (const key of REQUIRED_ARRAY_KEYS) {
    for (const gateId of readStringArray(contract, key)) {
      if (!nonBlockingGateIds.has(gateId)) {
        requiredGateIds.add(gateId);
      }
    }
  }
  return [...requiredGateIds];
};

const escapeRegExp = (value: string): string =>
  value.replace(REGEXP_SPECIAL_RE, "\\$&");

const markdownClaimsNotIntegrated = (
  markdown: string | null,
  gateId: string
): boolean => {
  if (!markdown) {
    return false;
  }
  return new RegExp(
    `\\|[^\\n]*\`?${escapeRegExp(gateId)}\`?[^\\n]*\\|[^\\n]*\\bnot_integrated\\b`,
    "u"
  ).test(markdown);
};

const fileExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> => {
  const resolvedPath = path.resolve(workspaceRoot, relativePath);
  if (!resolvedPath.startsWith(path.resolve(workspaceRoot))) {
    return false;
  }
  const fileStat = await stat(resolvedPath).catch(() => null);
  return Boolean(fileStat);
};

const collectPlannedGateRunnerEvidenceDiagnostics = async (params: {
  readonly contractJson: Record<string, unknown>;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const packageScripts = await readPackageScripts(params.workspaceRoot);
  if (!packageScripts) {
    return [];
  }
  const hooks = [
    {
      name: ".husky/pre-commit",
      text: await readHookText(params.workspaceRoot, "pre-commit"),
    },
    {
      name: ".husky/pre-push",
      text: await readHookText(params.workspaceRoot, "pre-push"),
    },
  ] as const;
  const errors: string[] = [];
  for (const gateId of readStringArray(
    params.contractJson,
    "plannedRequiredAfterIntegration"
  )) {
    const scriptName = toPackageScriptName(gateId);
    if (!(scriptName in packageScripts)) {
      continue;
    }
    const hookEvidence = hooks
      .filter((hook) => hook.text.includes(`npm run ${scriptName}`))
      .map((hook) => hook.name);
    if (hookEvidence.length === 0) {
      continue;
    }
    errors.push(
      `planned_gate_has_runner_evidence_after_integration:${gateId}:${[
        `package.json:${scriptName}`,
        ...hookEvidence,
      ].join(",")}`
    );
  }
  return errors;
};

export const collectQualityGatesIntegrationConsistencyDiagnostics =
  async (params: {
    readonly contractJson: Record<string, unknown>;
    readonly markdown: string | null;
    readonly workspaceRoot: string;
  }): Promise<readonly string[]> => {
    const errors: string[] = [];
    const commands = isRecord(params.contractJson.commands)
      ? params.contractJson.commands
      : {};

    for (const gateId of collectRequiredGateIds(params.contractJson)) {
      const gate = commands[gateId];
      if (isRecord(gate) && gate.availability === "not_integrated") {
        errors.push(
          `quality-gates.json keeps required gate "${gateId}" as not_integrated after integration`
        );
      }
      if (markdownClaimsNotIntegrated(params.markdown, gateId)) {
        errors.push(
          `quality-gates.md keeps required gate "${gateId}" as not_integrated after integration`
        );
      }
    }
    errors.push(
      ...(await collectPlannedGateRunnerEvidenceDiagnostics({
        contractJson: params.contractJson,
        workspaceRoot: params.workspaceRoot,
      }))
    );

    const integratedPaths = readStringArray(
      params.contractJson,
      "integratedPaths"
    );
    if (integratedPaths.length === 0) {
      errors.push("integratedPaths is missing or empty after integration");
    }
    for (const integratedPath of integratedPaths) {
      if (!(await fileExists(params.workspaceRoot, integratedPath))) {
        errors.push(`integratedPaths entry does not exist: ${integratedPath}`);
      }
    }

    return errors;
  };
