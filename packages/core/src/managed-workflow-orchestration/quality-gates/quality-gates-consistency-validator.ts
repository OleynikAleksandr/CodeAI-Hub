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
const NPM_RUN_SCRIPT_RE =
  /(?:^|[\s;&|()])npm\s+run\s+(?:(?:--silent|--if-present|--foreground-scripts|--ignore-scripts)\s+)*([^\s;&|()]+)/gmu;
const NON_BLOCKING_ARRAY_KEYS = [
  "advisory",
  "deferred",
  "plannedRequiredAfterIntegration",
] as const;

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

interface VerificationEvidence {
  readonly commands: ReadonlyMap<string, string>;
}

interface VerificationRequirement {
  readonly alternatives: readonly (readonly string[])[];
  readonly diagnosticCommand: string;
}

const appendVerificationCommands = (
  commands: Map<string, string>,
  rawCommands: readonly unknown[]
): void => {
  for (const entry of rawCommands) {
    if (typeof entry === "string") {
      commands.set(entry, "passed");
      continue;
    }
    if (!isRecord(entry) || typeof entry.command !== "string") {
      continue;
    }
    commands.set(
      entry.command,
      typeof entry.status === "string" ? entry.status : "unknown"
    );
  }
};

const appendVerificationCommandEvidence = (
  commands: Map<string, string>,
  rawEvidence: unknown
): void => {
  if (!isRecord(rawEvidence)) {
    return;
  }
  for (const [command, rawStatus] of Object.entries(rawEvidence)) {
    if (typeof rawStatus === "string") {
      commands.set(command, rawStatus);
      continue;
    }
    if (!isRecord(rawStatus)) {
      continue;
    }
    commands.set(
      command,
      typeof rawStatus.status === "string" ? rawStatus.status : "unknown"
    );
  }
};

const readVerificationCommandStatuses = (
  contractJson: Record<string, unknown>
): VerificationEvidence | null => {
  const commands = new Map<string, string>();
  const rawEvidence = contractJson.verificationEvidence;
  if (Array.isArray(rawEvidence)) {
    appendVerificationCommands(commands, rawEvidence);
  } else if (isRecord(rawEvidence)) {
    for (const key of [
      "commands",
      "commandRuns",
      "verificationCommandEvidence",
    ]) {
      const rawCommands = rawEvidence[key];
      if (Array.isArray(rawCommands)) {
        appendVerificationCommands(commands, rawCommands);
      }
    }
    appendVerificationCommandEvidence(commands, rawEvidence.commandEvidence);
  }
  const rawVerificationCommandEvidence =
    contractJson.verificationCommandEvidence;
  if (Array.isArray(rawVerificationCommandEvidence)) {
    appendVerificationCommands(commands, rawVerificationCommandEvidence);
  }
  appendVerificationCommandEvidence(commands, contractJson.commandEvidence);
  if (!rawEvidence && commands.size === 0) {
    return null;
  }
  return { commands };
};

const hasPassedCommand = (
  evidence: VerificationEvidence,
  command: string
): boolean => evidence.commands.get(command) === "passed";

const hasPassedCommandGroup = (
  evidence: VerificationEvidence,
  commands: readonly string[]
): boolean =>
  commands.length > 0 &&
  commands.every((command) => hasPassedCommand(evidence, command));

const collectVerificationEvidenceRequirements = async (params: {
  readonly contractJson: Record<string, unknown>;
  readonly workspaceRoot: string;
}): Promise<readonly VerificationRequirement[]> => {
  const requirements: VerificationRequirement[] = [];
  const packageScripts = await readPackageScripts(params.workspaceRoot);
  const allAlternative =
    packageScripts && "qg:all" in packageScripts ? ["npm run qg:all"] : null;
  const hookSpecs = [
    {
      aggregateScript: "qg:before-commit",
      contractKey: "requiredBeforeCommit",
      hookName: "pre-commit" as const,
    },
    {
      aggregateScript: "qg:before-push",
      contractKey: "requiredBeforePush",
      hookName: "pre-push" as const,
    },
  ];
  if (
    readStringArray(params.contractJson, "requiredBeforeModuleExecution")
      .length > 0
  ) {
    const alternatives = [
      ...(allAlternative ? [allAlternative] : []),
      ["npm run qg:before-module-execution"],
    ];
    requirements.push({
      alternatives,
      diagnosticCommand: "npm run qg:before-module-execution",
    });
  }
  for (const spec of hookSpecs) {
    const gateIds = readStringArray(params.contractJson, spec.contractKey);
    if (gateIds.length === 0) {
      continue;
    }
    const alternatives: string[][] = allAlternative ? [allAlternative] : [];
    if (packageScripts && spec.aggregateScript in packageScripts) {
      alternatives.push([`npm run ${spec.aggregateScript}`]);
    }
    const hookText = await readHookText(params.workspaceRoot, spec.hookName);
    const hookCommands = collectHookNpmRunScripts(hookText).map(
      (scriptName) => `npm run ${scriptName}`
    );
    if (hookCommands.length > 0) {
      alternatives.push(hookCommands);
    }
    requirements.push({
      alternatives,
      diagnosticCommand: `npm run ${spec.aggregateScript}`,
    });
    requirements.push({
      alternatives: [[`sh .husky/${spec.hookName}`]],
      diagnosticCommand: `sh .husky/${spec.hookName}`,
    });
  }
  return requirements;
};

const collectMissingVerificationRequirementDiagnostics = (
  evidence: VerificationEvidence,
  requirements: readonly VerificationRequirement[]
): readonly string[] => {
  const errors: string[] = [];
  for (const requirement of requirements) {
    if (
      requirement.alternatives.some((alternative) =>
        hasPassedCommandGroup(evidence, alternative)
      )
    ) {
      continue;
    }
    const status = evidence.commands.get(requirement.diagnosticCommand);
    if (status && status !== "passed") {
      errors.push(
        `verification_command_not_passed:${requirement.diagnosticCommand}:${status}`
      );
      continue;
    }
    errors.push(
      `missing_verification_command_evidence:${requirement.diagnosticCommand}`
    );
  }
  return errors;
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

export const collectQualityGatesVerificationEvidenceDiagnostics =
  async (params: {
    readonly contractJson: Record<string, unknown>;
    readonly workspaceRoot: string;
  }): Promise<readonly string[]> => {
    const errors: string[] = [];
    if (params.contractJson.verificationState !== "verified") {
      errors.push(
        typeof params.contractJson.verificationState === "string"
          ? `verification_state_not_verified:${params.contractJson.verificationState}`
          : "missing_verification_state"
      );
    }
    const evidence = readVerificationCommandStatuses(params.contractJson);
    if (!evidence) {
      errors.push("missing_verification_evidence");
      return errors;
    }
    errors.push(
      ...collectMissingVerificationRequirementDiagnostics(
        evidence,
        await collectVerificationEvidenceRequirements(params)
      )
    );
    return errors;
  };
