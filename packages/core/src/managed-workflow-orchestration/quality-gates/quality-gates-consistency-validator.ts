import { stat } from "node:fs/promises";
import path from "node:path";
import {
  collectNpmRunScripts,
  evaluateGateCommandReachability,
  readGateCommand,
} from "./quality-gates-command-reachability";
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
  const packageScripts = (await readPackageScripts(params.workspaceRoot)) ?? {};
  const contractCommands = isRecord(params.contractJson.commands)
    ? params.contractJson.commands
    : {};
  const aggregateAlternatives = (aggregateScript: string): string[][] => {
    const alternatives: string[][] = [];
    if ("qg:all" in packageScripts) {
      alternatives.push(["npm run qg:all"]);
    }
    if (aggregateScript in packageScripts) {
      alternatives.push([`npm run ${aggregateScript}`]);
    }
    return alternatives;
  };
  for (const gateId of readStringArray(
    params.contractJson,
    "requiredBeforeModuleExecution"
  )) {
    const command = readGateCommand(contractCommands, gateId);
    requirements.push({
      alternatives: [
        ...(command ? [[command]] : []),
        ...aggregateAlternatives("qg:before-module-execution"),
      ],
      diagnosticCommand: command ?? "npm run qg:before-module-execution",
    });
  }
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
  for (const spec of hookSpecs) {
    const gateIds = readStringArray(params.contractJson, spec.contractKey);
    if (gateIds.length === 0) {
      continue;
    }
    const hookText = await readHookText(params.workspaceRoot, spec.hookName);
    const hookCommands = collectNpmRunScripts(hookText).map(
      (scriptName) => `npm run ${scriptName}`
    );
    const gateCommands = gateIds
      .map((gateId) => readGateCommand(contractCommands, gateId))
      .filter((command): command is string => Boolean(command));
    requirements.push({
      alternatives: [
        [`sh .husky/${spec.hookName}`],
        ...aggregateAlternatives(spec.aggregateScript),
        ...(hookCommands.length > 0 ? [hookCommands] : []),
        ...(gateCommands.length > 0 ? [gateCommands] : []),
      ],
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
  const contractCommands = isRecord(params.contractJson.commands)
    ? params.contractJson.commands
    : {};
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
    const command = readGateCommand(contractCommands, gateId);
    if (!command) {
      continue;
    }
    const hookEvidence = hooks
      .filter(
        (hook) =>
          evaluateGateCommandReachability({
            command,
            hookText: hook.text,
            packageScripts,
          }).reachableFromHook
      )
      .map((hook) => hook.name);
    if (hookEvidence.length === 0) {
      continue;
    }
    errors.push(
      `planned_gate_has_runner_evidence_after_integration:${gateId}:${hookEvidence.join(",")}`
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
