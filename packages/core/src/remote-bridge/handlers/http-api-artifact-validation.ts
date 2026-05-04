const DESCRIPTION_TITLE_RE = /^#\s+Description:/m;
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const DIAGRAM_MODULES_TITLE_RE = /^#\s+(?:Module Inventory|Product Part:)/m;
const PRODUCT_PARTS_INDEX_TITLE_RE = /^#\s+Product Parts Index/m;
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

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "virtual-simulation.md"
  | "product-parts.index.md"
  | "product-part.md"
  | "module-map.flow.json";

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
