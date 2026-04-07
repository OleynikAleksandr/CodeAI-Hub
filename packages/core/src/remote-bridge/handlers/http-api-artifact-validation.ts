const DESCRIPTION_TITLE_RE = /^#\s+Description:/m;
const VIRTUAL_SIMULATION_TITLE_RE = /^#\s+Virtual Simulation:/m;
const DIAGRAM_MODULES_TITLE_RE = /^#\s+(?:Module Inventory|Product Part:)/m;
const PRODUCT_PARTS_INDEX_TITLE_RE = /^#\s+Product Parts Index/m;
const VIRTUAL_SIMULATION_SCENARIO_RE = /^##\s+(?:Сценарий|Scenario)\s+\d+\b/gm;

export type WorkflowArtifactFileName =
  | "Final_Description.md"
  | "virtual-simulation.md"
  | "product-parts.index.md"
  | "product-part.md"
  | "module-map.flow.json";

type WorkflowParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };
type WorkflowArtifactValidator = (content: string) => string | null;

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
  [
    "product-part.md",
    (content) =>
      validateRequiredHeader({
        content,
        emptyError: "Module inventory markdown is empty",
        headerError:
          "Module inventory markdown is missing '# Module Inventory' or '# Product Part:' header",
        headerPattern: DIAGRAM_MODULES_TITLE_RE,
      }),
  ],
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
  readonly fileName: WorkflowArtifactFileName;
}): string | null =>
  WORKFLOW_ARTIFACT_VALIDATORS.get(params.fileName)?.(params.content) ??
  "Unsupported artifact file";

export const normalizeArtifactContent = (content: string): string =>
  content.endsWith("\n") ? content : `${content}\n`;

export const normalizeAndValidateWorkflowStageArtifact = (params: {
  readonly fileName: WorkflowArtifactFileName;
  readonly markdown: string;
}): WorkflowParseResult<string> => {
  const content = normalizeArtifactContent(params.markdown);
  const error = resolveWorkflowArtifactValidationError({
    content,
    fileName: params.fileName,
  });
  return error ? { ok: false, error } : { ok: true, value: content };
};
