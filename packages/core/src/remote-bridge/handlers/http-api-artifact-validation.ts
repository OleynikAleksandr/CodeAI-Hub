const DESCRIPTION_TITLE_RE = /^#\s+Description:/m;
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const DIAGRAM_MODULES_TITLE_RE = /^#\s+(?:Module Inventory|Product Part:)/m;
const PRODUCT_PARTS_INDEX_TITLE_RE = /^#\s+Product Parts Index/m;
const APPLICATION_SKELETON_TITLE_RE = /^#\s+Application Skeleton/m;
const QUALITY_GATES_TITLE_RE = /^#\s+Quality Gates/m;
const VIRTUAL_SIMULATION_SCENARIO_RE = /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;
const PRODUCT_PART_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRODUCT_PART_FRONTMATTER_ID_RE =
  /^-\s+`part_id`:\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/m;
const PRODUCT_PART_FIELD_TABLE_ID_RE =
  /^\|\s*Part ID\s*\|\s*`?([a-z0-9]+(?:-[a-z0-9]+)*)`?\s*\|$/m;
const PRODUCT_PART_LEGACY_FIELD_ID_RE =
  /^-\s+Part ID:\s*`?([a-z0-9]+(?:-[a-z0-9]+)*)`?\s*$/m;
const PRODUCT_PART_CLUSTER_NODE_RE =
  /^###\s+(?:Cluster(?:\s+\d+\.)?:?\s+)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const PRODUCT_PART_LEGACY_CLUSTER_NODE_RE =
  /^###\s+Cluster(?:\s+\d+\.)?:?\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_MODULE_ROW_RE =
  /^\|\s*(?:\d+\s*\|\s*)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*[^|\n]+?\s*\|[ \t]*$/gm;
const PRODUCT_PART_LEGACY_MODULE_NODE_RE =
  /^###\s+Module:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const REQUIRED_QUALITY_GATE_ARRAY_KEYS = [
  "requiredBeforeCommit",
  "requiredBeforeModuleExecution",
  "requiredBeforePush",
  "requiredBeforeRelease",
] as const;
const NON_BLOCKING_QUALITY_GATE_ARRAY_KEYS = [
  "advisory",
  "deferred",
  "deferredUntilMaterialization",
  "plannedRequiredAfterIntegration",
  "plannedRequiredAfterMaterialization",
] as const;
const NON_BLOCKING_GATE_STATUSES = new Set([
  "advisory",
  "deferred",
  "planned",
  "plannedAfterIntegration",
  "plannedAfterMaterialization",
]);

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "virtual-simulation.md"
  | "product-parts.index.md"
  | "product-part.md"
  | "module-map.flow.json"
  | "application-skeleton.md"
  | "application-skeleton-map.json"
  | "quality-gates.md"
  | "quality-gates.json";

type WorkflowParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };
type WorkflowArtifactValidator = (
  content: string,
  expectedPartId: string | undefined
) => string | null;

const validateRequiredHeader = (params: {
  readonly content: string;
  readonly emptyError: string;
  readonly headerError: string;
  readonly headerPattern: RegExp;
}): string | null => {
  if (params.content.trim().length === 0) {
    return params.emptyError;
  }
  return params.headerPattern.test(params.content) ? null : params.headerError;
};

const validateJsonObjectSidecar = (params: {
  readonly content: string;
  readonly emptyError: string;
  readonly invalidJsonError: string;
  readonly invalidObjectError: string;
}): string | null => {
  if (params.content.trim().length === 0) {
    return params.emptyError;
  }
  try {
    const parsed = JSON.parse(params.content) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? null
      : params.invalidObjectError;
  } catch {
    return params.invalidJsonError;
  }
};

const parseJsonObject = (params: {
  readonly content: string;
  readonly emptyError: string;
  readonly invalidJsonError: string;
  readonly invalidObjectError: string;
}): WorkflowParseResult<Record<string, unknown>> => {
  if (params.content.trim().length === 0) {
    return { ok: false, error: params.emptyError };
  }
  try {
    const parsed = JSON.parse(params.content) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? { ok: true, value: parsed as Record<string, unknown> }
      : { ok: false, error: params.invalidObjectError };
  } catch {
    return { ok: false, error: params.invalidJsonError };
  }
};

const validateVirtualSimulation = (content: string): string | null => {
  if (content.trim().length === 0) {
    return "virtual-simulation markdown is empty";
  }
  if (!VIRTUAL_SIMULATION_TITLE_RE.test(content)) {
    return "virtual-simulation markdown is missing '# Virtual Simulation' header";
  }
  return (content.match(VIRTUAL_SIMULATION_SCENARIO_RE)?.length ?? 0) < 1
    ? "virtual-simulation markdown must include at least 1 scenario (## Сценарий N)"
    : null;
};

const extractProductPartId = (content: string): string | null => {
  for (const pattern of [
    PRODUCT_PART_FRONTMATTER_ID_RE,
    PRODUCT_PART_FIELD_TABLE_ID_RE,
    PRODUCT_PART_LEGACY_FIELD_ID_RE,
  ]) {
    const partId = pattern.exec(content)?.[1]?.trim();
    if (partId) {
      return partId;
    }
  }
  return null;
};

const countProductPartNodes = (content: string): number => {
  let count = 0;
  for (const pattern of [
    PRODUCT_PART_CLUSTER_NODE_RE,
    PRODUCT_PART_LEGACY_CLUSTER_NODE_RE,
    PRODUCT_PART_MODULE_ROW_RE,
    PRODUCT_PART_LEGACY_MODULE_NODE_RE,
  ]) {
    for (const match of content.matchAll(pattern)) {
      const nodeId = match[1]?.trim();
      if (nodeId && nodeId !== "module-id") {
        count += 1;
      }
    }
  }
  return count;
};

const validateProductPartArtifact = (
  content: string,
  expectedPartId: string | undefined
): string | null => {
  const headerError = validateRequiredHeader({
    content,
    emptyError: "Module inventory markdown is empty",
    headerError:
      "Module inventory markdown is missing '# Module Inventory' or '# Product Part:' header",
    headerPattern: DIAGRAM_MODULES_TITLE_RE,
  });
  if (headerError) {
    return headerError;
  }
  const partId = extractProductPartId(content);
  if (!partId) {
    return "Product part markdown is missing required Part ID";
  }
  if (!PRODUCT_PART_ID_RE.test(partId)) {
    return "Product part markdown has invalid Part ID";
  }
  if (expectedPartId && partId !== expectedPartId) {
    return `Product part markdown Part ID must match artifact path: ${expectedPartId}`;
  }
  return countProductPartNodes(content) < 1
    ? "Product part markdown must include at least one valid Cluster or Module node"
    : null;
};

const validateApplicationSkeletonMap = (content: string): string | null => {
  const parsed = parseJsonObject({
    content,
    emptyError: "Application skeleton map is empty",
    invalidJsonError: "Application skeleton map is not valid JSON",
    invalidObjectError: "Application skeleton map must be a JSON object",
  });
  if (!parsed.ok) {
    return parsed.error;
  }
  return Array.isArray(parsed.value.productParts)
    ? null
    : "Application skeleton map must include productParts array";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): WorkflowParseResult<readonly string[]> => {
  const array = value[key];
  if (array === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(array) || array.some((item) => typeof item !== "string")) {
    return { ok: false, error: `Quality gates ${key} must be a string array` };
  }
  return { ok: true, value: array };
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

const validateRequiredQualityGate = (params: {
  readonly commands: Record<string, unknown>;
  readonly gateId: string;
  readonly key: string;
}): string | null => {
  const gate = params.commands[params.gateId];
  if (!isRecord(gate)) {
    return `Quality gates ${params.key} references missing command ${params.gateId}`;
  }
  const status = readGateDesiredStatus(gate);
  if (status && NON_BLOCKING_GATE_STATUSES.has(status)) {
    return `Quality gates ${params.gateId} cannot be required while ${status}`;
  }
  if (
    gate.availability === "not_integrated" &&
    !(gate.integrationRequired === true && hasPlannedIntegrationPaths(gate))
  ) {
    return `Quality gates ${params.gateId} is not integrated and must list plannedIntegrationPaths`;
  }
  return null;
};

const validateNonBlockingQualityGate = (params: {
  readonly commands: Record<string, unknown>;
  readonly gateId: string;
  readonly key: (typeof NON_BLOCKING_QUALITY_GATE_ARRAY_KEYS)[number];
}): string | null => {
  const gate = params.commands[params.gateId];
  if (!isRecord(gate)) {
    return null;
  }
  if (params.key === "advisory") {
    const blockingIn = gate.blockingIn;
    return Array.isArray(blockingIn) && blockingIn.length > 0
      ? `Quality gates advisory command ${params.gateId} must not have blocking phases`
      : null;
  }
  if (params.key === "plannedRequiredAfterIntegration") {
    const status = readGateDesiredStatus(gate);
    if (status !== "active" || gate.availability !== "not_integrated") {
      return `Quality gates plannedRequiredAfterIntegration command ${params.gateId} must be active and not_integrated`;
    }
    return gate.integrationRequired === true && hasPlannedIntegrationPaths(gate)
      ? null
      : `Quality gates plannedRequiredAfterIntegration command ${params.gateId} must list plannedIntegrationPaths`;
  }
  return null;
};

const collectNonBlockingQualityGateIds = (params: {
  readonly commands: Record<string, unknown>;
  readonly contract: Record<string, unknown>;
}): WorkflowParseResult<ReadonlySet<string>> => {
  const nonBlockingGateIds = new Set<string>();
  for (const key of NON_BLOCKING_QUALITY_GATE_ARRAY_KEYS) {
    const parsed = readStringArray(params.contract, key);
    if (!parsed.ok) {
      return parsed;
    }
    for (const gateId of parsed.value) {
      nonBlockingGateIds.add(gateId);
      const error = validateNonBlockingQualityGate({
        commands: params.commands,
        gateId,
        key,
      });
      if (error) {
        return { ok: false, error };
      }
    }
  }
  return { ok: true, value: nonBlockingGateIds };
};

const validateRequiredQualityGateArray = (params: {
  readonly commands: Record<string, unknown>;
  readonly gateIds: readonly string[];
  readonly key: string;
  readonly nonBlockingGateIds: ReadonlySet<string>;
}): string | null => {
  for (const gateId of params.gateIds) {
    if (params.nonBlockingGateIds.has(gateId)) {
      return `Quality gates ${gateId} cannot be both required and non-blocking`;
    }
    const error = validateRequiredQualityGate({
      commands: params.commands,
      gateId,
      key: params.key,
    });
    if (error) {
      return error;
    }
  }
  return null;
};

const validateQualityGateArrays = (params: {
  readonly commands: Record<string, unknown>;
  readonly contract: Record<string, unknown>;
}): string | null => {
  const nonBlockingGateIds = collectNonBlockingQualityGateIds(params);
  if (!nonBlockingGateIds.ok) {
    return nonBlockingGateIds.error;
  }
  for (const key of REQUIRED_QUALITY_GATE_ARRAY_KEYS) {
    const parsed = readStringArray(params.contract, key);
    if (!parsed.ok) {
      return parsed.error;
    }
    const error = validateRequiredQualityGateArray({
      commands: params.commands,
      gateIds: parsed.value,
      key,
      nonBlockingGateIds: nonBlockingGateIds.value,
    });
    if (error) {
      return error;
    }
  }
  return null;
};

const validateQualityGatesContract = (content: string): string | null => {
  const parsed = parseJsonObject({
    content,
    emptyError: "Quality gates contract is empty",
    invalidJsonError: "Quality gates contract is not valid JSON",
    invalidObjectError: "Quality gates contract must be a JSON object",
  });
  if (!parsed.ok) {
    return parsed.error;
  }
  const commands = parsed.value.commands;
  if (Array.isArray(commands)) {
    return "Quality gates contract commands must be an object keyed by gate id";
  }
  if (!isRecord(commands)) {
    return "Quality gates contract must include commands object";
  }
  return validateQualityGateArrays({
    commands,
    contract: parsed.value,
  });
};

const WORKFLOW_ARTIFACT_VALIDATORS = new Map<
  WorkflowArtifactFileName,
  WorkflowArtifactValidator
>([
  [
    "Final_Description.md",
    (content) =>
      validateRequiredHeader({
        content,
        emptyError: "Description markdown is empty",
        headerError: "Description markdown is missing '# Description:' header",
        headerPattern: DESCRIPTION_TITLE_RE,
      }),
  ],
  ["virtual-simulation.md", validateVirtualSimulation],
  [
    "product-parts.index.md",
    (content) =>
      validateRequiredHeader({
        content,
        emptyError: "Product parts index markdown is empty",
        headerError:
          "Product parts index markdown is missing '# Product Parts Index' header",
        headerPattern: PRODUCT_PARTS_INDEX_TITLE_RE,
      }),
  ],
  ["product-part.md", validateProductPartArtifact],
  [
    "module-map.flow.json",
    (content) =>
      validateJsonObjectSidecar({
        content,
        emptyError: "Diagram flow sidecar is empty",
        invalidJsonError: "Diagram flow sidecar is not valid JSON",
        invalidObjectError: "Diagram flow sidecar must be a JSON object",
      }),
  ],
  [
    "application-skeleton.md",
    (content) =>
      validateRequiredHeader({
        content,
        emptyError: "Application skeleton markdown is empty",
        headerError:
          "Application skeleton markdown is missing '# Application Skeleton' header",
        headerPattern: APPLICATION_SKELETON_TITLE_RE,
      }),
  ],
  ["application-skeleton-map.json", validateApplicationSkeletonMap],
  [
    "quality-gates.md",
    (content) =>
      validateRequiredHeader({
        content,
        emptyError: "Quality gates markdown is empty",
        headerError:
          "Quality gates markdown is missing '# Quality Gates' header",
        headerPattern: QUALITY_GATES_TITLE_RE,
      }),
  ],
  ["quality-gates.json", validateQualityGatesContract],
]);

const resolveWorkflowArtifactValidationError = (params: {
  readonly content: string;
  readonly expectedPartId?: string;
  readonly fileName: WorkflowArtifactFileName;
}): string | null => {
  const validator = WORKFLOW_ARTIFACT_VALIDATORS.get(params.fileName);
  if (!validator) {
    return "Unsupported artifact file";
  }
  return validator(params.content, params.expectedPartId);
};

export const normalizeArtifactContent = (content: string): string =>
  content.endsWith("\n") ? content : `${content}\n`;

export const normalizeAndValidateWorkflowStageArtifact = (params: {
  readonly expectedPartId?: string;
  readonly fileName: WorkflowArtifactFileName;
  readonly markdown: string;
}): WorkflowParseResult<string> => {
  const content = normalizeArtifactContent(params.markdown);
  const error = resolveWorkflowArtifactValidationError({
    content,
    expectedPartId: params.expectedPartId,
    fileName: params.fileName,
  });
  return error ? { ok: false, error } : { ok: true, value: content };
};
