import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { collectQualityGatesIntegrationConsistencyDiagnostics } from "./quality-gates-consistency-validator";
import {
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesIntegrationRepairPrompt,
  buildQualityGatesPersistentReturnMessage,
  buildQualityGatesUserReviewMessage,
} from "./quality-gates-prompt-builder";
import { validateQualityGatesResearchArtifacts } from "./quality-gates-research-validator";

export type QualityGatesManagedPhase = "draft" | "integration";

export type QualityGatesManagedNextAction =
  | "open_persistent_return"
  | "open_user_review"
  | "repair_current_artifact"
  | "repair_integration";

export interface QualityGatesManagedValidationRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface QualityGatesManagedValidationResult {
  readonly contractJson: Record<string, unknown> | null;
  readonly diagnostics: readonly string[];
  readonly nextAction: QualityGatesManagedNextAction;
  readonly nextPrompt: string | null;
  readonly phase: QualityGatesManagedPhase;
  readonly valid: boolean;
}

const QUALITY_GATES_TITLE_RE = /^#\s+Quality Gates(?:\s+Baseline)?\b/imu;
const MARKDOWN_ACCEPTED_TRUE_RE = /\baccepted\s*:\s*true\b/iu;
const MARKDOWN_INTEGRATED_TRUE_RE = /\bintegrated\s*:\s*true\b/iu;
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

const relativeQualityGatesPath = (
  workspaceSlug: string,
  fileName: "quality-gates.json" | "quality-gates.md"
): string => `.codeai-hub/${workspaceSlug}/quality_gates/${fileName}`;

const readRequiredFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const parseJsonObject = (
  content: string | null
): {
  readonly errors: readonly string[];
  readonly value: Record<string, unknown> | null;
} => {
  if (!content) {
    return { errors: ["missing_quality_gates_json"], value: null };
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return { errors: [], value: parsed as Record<string, unknown> };
    }
    return { errors: ["json_root_not_object"], value: null };
  } catch (error) {
    return {
      errors: [
        `json_parse_error: ${error instanceof Error ? error.message : String(error)}`,
      ],
      value: null,
    };
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  if (!value) {
    return false;
  }
  if (value.accepted === true) {
    return true;
  }
  return isRecord(value.acceptance) && value.acceptance.accepted === true;
};

const readIntegratedFlag = (value: Record<string, unknown> | null): boolean =>
  value?.integrated === true;

const readIntegrationState = (
  value: Record<string, unknown> | null
): string | null =>
  typeof value?.integrationState === "string" ? value.integrationState : null;

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): {
  readonly errors: readonly string[];
  readonly value: readonly string[];
} => {
  const raw = value[key];
  if (raw === undefined) {
    return { errors: [], value: [] };
  }
  if (!Array.isArray(raw) || raw.some((entry) => typeof entry !== "string")) {
    return { errors: [`${key}_not_string_array`], value: [] };
  }
  return { errors: [], value: raw as readonly string[] };
};

const readCommands = (
  contract: Record<string, unknown> | null
): {
  readonly commands: Record<string, unknown>;
  readonly errors: readonly string[];
} => {
  if (!contract) {
    return { commands: {}, errors: [] };
  }
  if (Array.isArray(contract.commands)) {
    return { commands: {}, errors: ["commands_array"] };
  }
  if (
    !isRecord(contract.commands) ||
    Object.keys(contract.commands).length < 1
  ) {
    return { commands: {}, errors: ["commands_missing"] };
  }
  return { commands: contract.commands, errors: [] };
};

const readGateDesiredStatus = (
  gate: Record<string, unknown>
): string | null => {
  const status = gate.desiredStatus ?? gate.status;
  return typeof status === "string" ? status : null;
};

const hasPlannedIntegrationPaths = (gate: Record<string, unknown>): boolean =>
  Array.isArray(gate.plannedIntegrationPaths) &&
  gate.plannedIntegrationPaths.some((item) => typeof item === "string");

const collectNonBlockingGateIds = (
  contract: Record<string, unknown>,
  commands: Record<string, unknown>
): {
  readonly errors: readonly string[];
  readonly gateIds: ReadonlySet<string>;
} => {
  const errors: string[] = [];
  const nonBlockingGateIds = new Set<string>();
  for (const key of NON_BLOCKING_ARRAY_KEYS) {
    const parsed = readStringArray(contract, key);
    errors.push(...parsed.errors);
    for (const gateId of parsed.value) {
      nonBlockingGateIds.add(gateId);
      const gate = commands[gateId];
      if (!(key === "advisory" && isRecord(gate))) {
        continue;
      }
      const blockingIn = gate.blockingIn;
      if (Array.isArray(blockingIn) && blockingIn.length > 0) {
        errors.push(`advisory_gate_has_blocking_phases:${gateId}`);
      }
    }
  }
  return { errors, gateIds: nonBlockingGateIds };
};

const collectRequiredGateDiagnostics = (
  contract: Record<string, unknown>,
  commands: Record<string, unknown>,
  nonBlockingGateIds: ReadonlySet<string>
): readonly string[] => {
  const errors: string[] = [];
  for (const key of REQUIRED_ARRAY_KEYS) {
    const parsed = readStringArray(contract, key);
    errors.push(...parsed.errors);
    for (const gateId of parsed.value) {
      if (nonBlockingGateIds.has(gateId)) {
        errors.push(`required_gate_is_non_blocking:${gateId}`);
      }
      const gate = commands[gateId];
      if (!isRecord(gate)) {
        errors.push(`missing_required_command:${gateId}`);
        continue;
      }
      const status = readGateDesiredStatus(gate);
      if (status === "advisory" || status === "deferred") {
        errors.push(`required_gate_non_active:${gateId}`);
      }
      if (
        gate.availability === "not_integrated" &&
        !(gate.integrationRequired === true && hasPlannedIntegrationPaths(gate))
      ) {
        errors.push(`not_integrated_required_gate:${gateId}`);
      }
    }
  }
  return errors;
};

const collectGateArrayDiagnostics = (
  contract: Record<string, unknown>,
  commands: Record<string, unknown>
): readonly string[] => {
  const nonBlocking = collectNonBlockingGateIds(contract, commands);
  return [
    ...nonBlocking.errors,
    ...collectRequiredGateDiagnostics(contract, commands, nonBlocking.gateIds),
  ];
};

const validateDraftShape = (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly markdown: string | null;
}): readonly string[] => {
  const errors: string[] = [];
  if (params.markdown) {
    if (!QUALITY_GATES_TITLE_RE.test(params.markdown)) {
      errors.push("markdown_wrong_stage");
    }
    if (MARKDOWN_ACCEPTED_TRUE_RE.test(params.markdown)) {
      errors.push("markdown_premature_acceptance");
    }
    if (MARKDOWN_INTEGRATED_TRUE_RE.test(params.markdown)) {
      errors.push("markdown_premature_integration");
    }
  } else {
    errors.push("missing_markdown");
  }
  if (!params.contractJson) {
    return errors;
  }
  if (params.contractJson.schema !== "codeai-quality-gates-v1") {
    errors.push("schema_invalid");
  }
  const { commands, errors: commandErrors } = readCommands(params.contractJson);
  errors.push(...commandErrors);
  errors.push(...collectGateArrayDiagnostics(params.contractJson, commands));
  if (readAcceptedFlag(params.contractJson)) {
    errors.push("premature_accepted_true");
  }
  if (readIntegratedFlag(params.contractJson)) {
    errors.push("premature_integrated_true");
  }
  const state = readIntegrationState(params.contractJson);
  if (
    state === "integrating" ||
    state === "in_progress" ||
    state === "integrated"
  ) {
    errors.push("premature_integration_state");
  }
  return errors;
};

const toPackageScriptName = (gateId: string): string =>
  gateId.startsWith("qg-")
    ? `qg:${gateId.slice("qg-".length)}`
    : `qg:${gateId}`;

const readPackageScripts = async (
  workspaceRoot: string
): Promise<Record<string, string> | null> => {
  const raw = await readRequiredFile(path.join(workspaceRoot, "package.json"));
  if (!raw) {
    return null;
  }
  try {
    const packageJson = JSON.parse(raw) as unknown;
    if (
      isRecord(packageJson) &&
      isRecord(packageJson.scripts) &&
      Object.values(packageJson.scripts).every(
        (entry) => typeof entry === "string"
      )
    ) {
      return packageJson.scripts as Record<string, string>;
    }
  } catch {
    return null;
  }
  return null;
};

const readHookText = async (
  workspaceRoot: string,
  hookName: "pre-commit" | "pre-push"
): Promise<string> =>
  (await readRequiredFile(path.join(workspaceRoot, ".husky", hookName))) ?? "";

const collectRequiredHookDiagnostics = async (params: {
  readonly contract: Record<string, unknown>;
  readonly packageScripts: Record<string, string> | null;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const errors: string[] = [];
  if (!params.packageScripts) {
    errors.push("missing_package_json");
  }
  const hookSpecs = [
    {
      gateIds: readStringArray(params.contract, "requiredBeforeCommit").value,
      hookName: "pre-commit" as const,
    },
    {
      gateIds: readStringArray(params.contract, "requiredBeforePush").value,
      hookName: "pre-push" as const,
    },
  ];
  for (const spec of hookSpecs) {
    const hookText = await readHookText(params.workspaceRoot, spec.hookName);
    for (const gateId of spec.gateIds) {
      const scriptName = toPackageScriptName(gateId);
      if (params.packageScripts && !(scriptName in params.packageScripts)) {
        errors.push(`missing_package_script:${gateId}`);
      }
      if (!hookText.includes(`npm run ${scriptName}`)) {
        errors.push(`missing_hook_gate:${gateId} in .husky/${spec.hookName}`);
      }
    }
  }
  return errors;
};

const validateIntegrationShape = async (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly markdown: string | null;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const errors = [...validateDraftShape({ ...params, contractJson: null })];
  if (!params.contractJson) {
    return [...errors, "missing_quality_gates_json"];
  }
  if (params.contractJson.schema !== "codeai-quality-gates-v1") {
    errors.push("schema_invalid");
  }
  const { commands, errors: commandErrors } = readCommands(params.contractJson);
  errors.push(...commandErrors);
  errors.push(...collectGateArrayDiagnostics(params.contractJson, commands));
  if (!readAcceptedFlag(params.contractJson)) {
    errors.push("accepted_required_for_integration");
  }
  if (!readIntegratedFlag(params.contractJson)) {
    errors.push("integrated_required");
  }
  if (readIntegrationState(params.contractJson) !== "integrated") {
    errors.push("integration_state_integrated_required");
  }
  errors.push(
    ...(await collectRequiredHookDiagnostics({
      contract: params.contractJson,
      packageScripts: await readPackageScripts(params.workspaceRoot),
      workspaceRoot: params.workspaceRoot,
    }))
  );
  errors.push(
    ...(await collectQualityGatesIntegrationConsistencyDiagnostics({
      contractJson: params.contractJson,
      markdown: params.markdown,
      workspaceRoot: params.workspaceRoot,
    }))
  );
  return errors;
};

const resolvePhase = (
  contractJson: Record<string, unknown> | null
): QualityGatesManagedPhase =>
  readAcceptedFlag(contractJson) ||
  readIntegratedFlag(contractJson) ||
  ["failed", "in_progress", "integrating", "integrated"].includes(
    readIntegrationState(contractJson) ?? ""
  )
    ? "integration"
    : "draft";

const buildInvalidResult = (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly diagnostics: readonly string[];
  readonly phase: QualityGatesManagedPhase;
  readonly workspaceSlug: string;
}): QualityGatesManagedValidationResult => ({
  contractJson: params.contractJson,
  diagnostics: params.diagnostics,
  nextAction:
    params.phase === "integration"
      ? "repair_integration"
      : "repair_current_artifact",
  nextPrompt:
    params.phase === "integration"
      ? buildQualityGatesIntegrationRepairPrompt({
          attemptNumber: 1,
          diagnostics: params.diagnostics,
          workspaceSlug: params.workspaceSlug,
        })
      : buildQualityGatesDraftRepairPrompt({
          diagnostics: params.diagnostics,
          workspaceSlug: params.workspaceSlug,
        }),
  phase: params.phase,
  valid: false,
});

export const validateQualityGatesManagedArtifacts = async (
  request: QualityGatesManagedValidationRequest
): Promise<QualityGatesManagedValidationResult> => {
  const markdown = await readRequiredFile(
    path.join(
      request.workspaceRoot,
      relativeQualityGatesPath(request.workspaceSlug, "quality-gates.md")
    )
  );
  const parsed = parseJsonObject(
    await readRequiredFile(
      path.join(
        request.workspaceRoot,
        relativeQualityGatesPath(request.workspaceSlug, "quality-gates.json")
      )
    )
  );
  const phase = resolvePhase(parsed.value);
  const diagnostics =
    phase === "integration"
      ? [
          ...parsed.errors,
          ...(await validateIntegrationShape({
            contractJson: parsed.value,
            markdown,
            workspaceRoot: request.workspaceRoot,
          })),
        ]
      : [
          ...parsed.errors,
          ...(await validateQualityGatesResearchArtifacts(request)),
          ...validateDraftShape({ contractJson: parsed.value, markdown }),
        ];
  if (diagnostics.length > 0) {
    return buildInvalidResult({
      contractJson: parsed.value,
      diagnostics,
      phase,
      workspaceSlug: request.workspaceSlug,
    });
  }
  if (phase === "integration") {
    return {
      contractJson: parsed.value,
      diagnostics: [],
      nextAction: "open_persistent_return",
      nextPrompt: buildQualityGatesPersistentReturnMessage(),
      phase,
      valid: true,
    };
  }
  return {
    contractJson: parsed.value,
    diagnostics: [],
    nextAction: "open_user_review",
    nextPrompt: buildQualityGatesUserReviewMessage(),
    phase,
    valid: true,
  };
};
