import path from "node:path";
import {
  collectQualityGatesIntegrationConsistencyDiagnostics,
  collectQualityGatesVerificationEvidenceDiagnostics,
} from "./quality-gates-consistency-validator";
import { collectQualityGatesHookCommandDiagnostics } from "./quality-gates-formal-verification-runner";
import { collectPlannedRequiredGateDiagnostics } from "./quality-gates-planned-required-validator";
import {
  buildQualityGatesDraftRepairPrompt,
  buildQualityGatesIntegrationRepairPrompt,
  buildQualityGatesPersistentReturnMessage,
  buildQualityGatesUserReviewMessage,
  buildQualityGatesVerificationRepairPrompt,
} from "./quality-gates-prompt-builder";
import { collectRequiredSizePolicyDiagnostics } from "./quality-gates-required-size-policy";
import { resolveQualityGatesResearchFirstBoundary } from "./quality-gates-research-first-boundary";
import { readQualityGatesCurrentTaskId } from "./quality-gates-stage-plan-state-reader";
import { collectQualityGatesTerminalResidueDiagnostics } from "./quality-gates-terminal-residue-validator";
import { readRequiredFile } from "./quality-gates-workspace-files";

export type QualityGatesManagedPhase = "draft" | "integration" | "verification";

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

const QUALITY_GATES_TITLE_RE = /^#\s+Quality Gates Baseline\b/mu;
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
const INTEGRATION_PLAN_TASK_RE =
  /^quality-gates\.phase3\.(?:integrate|repair)\.task\d+$/u;
const VERIFICATION_PLAN_TASK_RE =
  /^quality-gates\.phase4\.(?:verify|repair)\.task\d+$/u;

const relativeQualityGatesPath = (
  workspaceSlug: string,
  fileName: "quality-gates.json" | "quality-gates.md"
): string => `.codeai-hub/${workspaceSlug}/quality_gates/${fileName}`;

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
  errors.push(
    ...collectPlannedRequiredGateDiagnostics(params.contractJson, commands)
  );
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
const validateIntegrationShape = async (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly markdown: string | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const errors = params.markdown ? [] : ["missing_markdown"];
  if (params.markdown && !QUALITY_GATES_TITLE_RE.test(params.markdown)) {
    errors.push("markdown_wrong_stage");
  }
  if (!params.contractJson) {
    return [...errors, "missing_quality_gates_json"];
  }
  if (params.contractJson.schema !== "codeai-quality-gates-v1") {
    errors.push("schema_invalid");
  }
  const { commands, errors: commandErrors } = readCommands(params.contractJson);
  errors.push(...commandErrors);
  errors.push(...collectGateArrayDiagnostics(params.contractJson, commands));
  errors.push(
    ...collectRequiredSizePolicyDiagnostics(params.contractJson, commands)
  );
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
    ...(await collectQualityGatesHookCommandDiagnostics({
      contract: params.contractJson,
      workspaceRoot: params.workspaceRoot,
    }))
  );
  errors.push(
    ...(await collectQualityGatesIntegrationConsistencyDiagnostics({
      contractJson: params.contractJson,
      workspaceRoot: params.workspaceRoot,
    }))
  );
  errors.push(
    ...(await collectQualityGatesTerminalResidueDiagnostics({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    }))
  );
  return errors;
};

const resolveArtifactPhase = (
  contractJson: Record<string, unknown> | null
): QualityGatesManagedPhase =>
  readAcceptedFlag(contractJson) ||
  readIntegratedFlag(contractJson) ||
  ["failed", "in_progress", "integrating", "integrated"].includes(
    readIntegrationState(contractJson) ?? ""
  )
    ? "integration"
    : "draft";

const resolvePlanPhase = async (
  workspaceRoot: string
): Promise<QualityGatesManagedPhase | null> => {
  const currentTaskId = await readQualityGatesCurrentTaskId(workspaceRoot);
  if (currentTaskId && VERIFICATION_PLAN_TASK_RE.test(currentTaskId)) {
    return "verification";
  }
  return currentTaskId && INTEGRATION_PLAN_TASK_RE.test(currentTaskId)
    ? "integration"
    : null;
};

const resolvePhase = async (
  request: QualityGatesManagedValidationRequest,
  contractJson: Record<string, unknown> | null
): Promise<QualityGatesManagedPhase> =>
  (await resolvePlanPhase(request.workspaceRoot)) ??
  resolveArtifactPhase(contractJson);

const buildRepairPrompt = (params: {
  readonly diagnostics: readonly string[];
  readonly phase: QualityGatesManagedPhase;
  readonly workspaceSlug: string;
}): string => {
  const options = {
    diagnostics: params.diagnostics,
    workspaceSlug: params.workspaceSlug,
  };
  if (params.phase === "draft") {
    return buildQualityGatesDraftRepairPrompt(options);
  }
  if (params.phase === "verification") {
    return buildQualityGatesVerificationRepairPrompt({
      ...options,
      attemptNumber: 1,
    });
  }
  return buildQualityGatesIntegrationRepairPrompt({
    ...options,
    attemptNumber: 1,
  });
};

const buildInvalidResult = (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly diagnostics: readonly string[];
  readonly phase: QualityGatesManagedPhase;
  readonly workspaceSlug: string;
}): QualityGatesManagedValidationResult => ({
  contractJson: params.contractJson,
  diagnostics: params.diagnostics,
  nextAction:
    params.phase === "draft" ? "repair_current_artifact" : "repair_integration",
  nextPrompt: buildRepairPrompt(params),
  phase: params.phase,
  valid: false,
});

const collectDiagnosticsForPhase = async (params: {
  readonly contractJson: Record<string, unknown> | null;
  readonly markdown: string | null;
  readonly parsedErrors: readonly string[];
  readonly phase: QualityGatesManagedPhase;
  readonly researchDiagnostics: readonly string[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  if (params.phase !== "draft") {
    return [
      ...params.parsedErrors,
      ...(await validateIntegrationShape({
        contractJson: params.contractJson,
        markdown: params.markdown,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      })),
      ...(params.phase === "verification" && params.contractJson
        ? await collectQualityGatesVerificationEvidenceDiagnostics({
            contractJson: params.contractJson,
            workspaceRoot: params.workspaceRoot,
          })
        : []),
    ];
  }
  return [
    ...params.parsedErrors,
    ...params.researchDiagnostics,
    ...validateDraftShape({
      contractJson: params.contractJson,
      markdown: params.markdown,
    }),
  ];
};

export const validateQualityGatesManagedArtifacts = async (
  request: QualityGatesManagedValidationRequest
): Promise<QualityGatesManagedValidationResult> => {
  const markdown = await readRequiredFile(
    path.join(
      request.workspaceRoot,
      relativeQualityGatesPath(request.workspaceSlug, "quality-gates.md")
    )
  );
  const contractJsonText = await readRequiredFile(
    path.join(
      request.workspaceRoot,
      relativeQualityGatesPath(request.workspaceSlug, "quality-gates.json")
    )
  );
  const researchBoundary = await resolveQualityGatesResearchFirstBoundary({
    contractJsonText,
    contractMarkdown: markdown,
    request,
  });
  if (researchBoundary.decision) {
    return researchBoundary.decision;
  }
  const parsed = parseJsonObject(contractJsonText);
  const phase = await resolvePhase(request, parsed.value);
  const diagnostics = await collectDiagnosticsForPhase({
    contractJson: parsed.value,
    markdown,
    parsedErrors: parsed.errors,
    phase,
    researchDiagnostics: researchBoundary.researchDiagnostics,
    workspaceRoot: request.workspaceRoot,
    workspaceSlug: request.workspaceSlug,
  });
  if (diagnostics.length > 0) {
    return buildInvalidResult({
      contractJson: parsed.value,
      diagnostics,
      phase,
      workspaceSlug: request.workspaceSlug,
    });
  }
  if (phase === "integration" || phase === "verification") {
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
