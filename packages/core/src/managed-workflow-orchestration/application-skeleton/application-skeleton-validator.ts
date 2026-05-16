import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { auditApplicationSkeletonEnvironmentReadiness } from "../../remote-bridge/handlers/application-skeleton-environment-readiness-audit";
import { validateApplicationSkeletonMaterialization } from "../../remote-bridge/handlers/application-skeleton-materialization-validator";
import {
  isRecord,
  validateApplicationSkeletonFoundationDraft,
} from "./application-skeleton-foundation-contract";
import {
  buildApplicationSkeletonDraftRepairPrompt,
  buildApplicationSkeletonMaterializationRepairPrompt,
  buildApplicationSkeletonPersistentReturnMessage,
  buildApplicationSkeletonUserReviewMessage,
} from "./application-skeleton-prompt-builder";
import {
  collectApplicationSkeletonCodePaths,
  validateApplicationSkeletonProductTree,
} from "./application-skeleton-tree-shape-validator";

export type ApplicationSkeletonManagedPhase = "draft" | "materialization";

export type ApplicationSkeletonManagedNextAction =
  | "open_user_review"
  | "open_persistent_return"
  | "repair_current_artifact"
  | "repair_materialization";

export interface ApplicationSkeletonManagedValidationRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface ApplicationSkeletonManagedValidationResult {
  readonly diagnostics: readonly string[];
  readonly mapJson: Record<string, unknown> | null;
  readonly nextAction: ApplicationSkeletonManagedNextAction;
  readonly nextPrompt: string | null;
  readonly phase: ApplicationSkeletonManagedPhase;
  readonly valid: boolean;
}

const APPLICATION_SKELETON_TITLE_RE = /^#\s+Application Skeleton\b/imu;
const REQUIRED_SECTION_RE =
  /^##\s+(?:Overview|Architecture|Stack|Product Parts|Filesystem|Materialization|Assumptions)\b/imu;
const UNSAFE_PATH_SEGMENT_RE = /(^|\/)\.\.(\/|$)/u;
const MARKDOWN_ACCEPTED_TRUE_RE = /\baccepted\s*:\s*true\b/iu;
const MARKDOWN_MATERIALIZED_TRUE_RE = /\bmaterialized\s*:\s*true\b/iu;
const MARKDOWN_UNRESOLVED_FRAMEWORK_RE =
  /^.*frameworks?.*(?:не\s+зафикс|не\s+выбран|не\s+выбрано|not\s+(?:selected|fixed|chosen)|pending|tbd|unknown|unresolved).*$/imu;

const relativeApplicationSkeletonPath = (
  workspaceSlug: string,
  fileName: "application-skeleton.md" | "application-skeleton-map.json"
): string => `.codeai-hub/${workspaceSlug}/application_skeleton/${fileName}`;

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
    return { errors: ["missing_map_json"], value: null };
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

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  if (!value) {
    return false;
  }
  if (value.accepted === true) {
    return true;
  }
  return isRecord(value.acceptance) && value.acceptance.accepted === true;
};

const readMaterializedFlag = (
  value: Record<string, unknown> | null
): boolean => {
  if (!value) {
    return false;
  }
  if (value.materialized === true) {
    return true;
  }
  return (
    isRecord(value.materialization) &&
    value.materialization.materialized === true
  );
};

const readMaterializationState = (
  value: Record<string, unknown> | null
): string | null => {
  if (typeof value?.materializationState === "string") {
    return value.materializationState;
  }
  if (typeof value?.status === "string") {
    return value.status;
  }
  return null;
};

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] => {
  const raw = value?.[key];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === "string")
    : [];
};

const formatOpenQuestion = (entry: unknown, index: number): string => {
  if (typeof entry === "string") {
    return entry.trim() || `Open question #${index + 1}`;
  }
  if (!isRecord(entry)) {
    return `Open question #${index + 1}`;
  }
  const question =
    typeof entry.question === "string" ? entry.question.trim() : "";
  const id = typeof entry.id === "string" ? entry.id.trim() : "";
  if (question && id) {
    return `${id}: ${question}`;
  }
  return question || id || `Open question #${index + 1}`;
};

const readOpenQuestions = (
  value: Record<string, unknown> | null
): readonly string[] =>
  Array.isArray(value?.openQuestions)
    ? value.openQuestions.map(formatOpenQuestion)
    : [];

const collectDeclaredPaths = (
  value: Record<string, unknown> | null
): readonly string[] => [
  ...readStringArray(value, "plannedPaths"),
  ...readStringArray(value, "materializedPaths"),
  ...collectApplicationSkeletonCodePaths(value),
];

const validateRelativePath = (value: string): string | null => {
  const normalized = value.trim().replace(/\\/g, "/");
  if (!normalized) {
    return "invalid_path_value: empty path";
  }
  if (path.isAbsolute(normalized)) {
    return `unsafe_path_value: absolute path ${value}`;
  }
  if (UNSAFE_PATH_SEGMENT_RE.test(normalized)) {
    return `unsafe_path_value: parent traversal ${value}`;
  }
  if (normalized === "node_modules" || normalized.startsWith("node_modules/")) {
    return `unsafe_path_value: node_modules path ${value}`;
  }
  return null;
};

const validateDraftMarkdown = (markdown: string | null): readonly string[] => {
  if (!markdown) {
    return ["missing_markdown"];
  }
  const errors: string[] = [];
  if (!APPLICATION_SKELETON_TITLE_RE.test(markdown)) {
    errors.push("markdown_wrong_stage");
  }
  if (!REQUIRED_SECTION_RE.test(markdown)) {
    errors.push("markdown_missing_required_section");
  }
  if (MARKDOWN_ACCEPTED_TRUE_RE.test(markdown)) {
    errors.push("markdown_premature_acceptance");
  }
  if (MARKDOWN_MATERIALIZED_TRUE_RE.test(markdown)) {
    errors.push("markdown_premature_materialization");
  }
  if (MARKDOWN_UNRESOLVED_FRAMEWORK_RE.test(markdown)) {
    errors.push("markdown_unresolved_framework_decision");
  }
  return errors;
};

const validateDraftShape = (params: {
  readonly mapJson: Record<string, unknown> | null;
  readonly markdown: string | null;
}): readonly string[] => {
  const errors: string[] = [...validateDraftMarkdown(params.markdown)];
  if (!params.mapJson) {
    return errors;
  }
  if (readAcceptedFlag(params.mapJson)) {
    errors.push("premature_accepted_true");
  }
  if (readMaterializedFlag(params.mapJson)) {
    errors.push("premature_materialized_true");
  }
  const materializationState = readMaterializationState(params.mapJson);
  if (materializationState === "materialized") {
    errors.push("premature_materialization_state");
  }
  const declaredPaths = collectDeclaredPaths(params.mapJson);
  if (
    declaredPaths.length === 0 &&
    !Array.isArray(params.mapJson.productParts)
  ) {
    errors.push("missing_required_field: productParts or planned paths");
  }
  for (const declaredPath of declaredPaths) {
    const pathError = validateRelativePath(declaredPath);
    if (pathError) {
      errors.push(pathError);
    }
  }
  errors.push(...validateApplicationSkeletonProductTree(params.mapJson));
  errors.push(...validateApplicationSkeletonFoundationDraft(params.mapJson));
  return errors;
};

const resolvePhase = (
  mapJson: Record<string, unknown> | null
): ApplicationSkeletonManagedPhase =>
  readAcceptedFlag(mapJson) ||
  readMaterializedFlag(mapJson) ||
  readMaterializationState(mapJson) === "materializing" ||
  readMaterializationState(mapJson) === "materialized"
    ? "materialization"
    : "draft";

const buildInvalidResult = (params: {
  readonly diagnostics: readonly string[];
  readonly mapJson: Record<string, unknown> | null;
  readonly phase: ApplicationSkeletonManagedPhase;
  readonly workspaceSlug: string;
}): ApplicationSkeletonManagedValidationResult => ({
  diagnostics: params.diagnostics,
  mapJson: params.mapJson,
  nextAction:
    params.phase === "materialization"
      ? "repair_materialization"
      : "repair_current_artifact",
  nextPrompt:
    params.phase === "materialization"
      ? buildApplicationSkeletonMaterializationRepairPrompt({
          attemptNumber: 1,
          diagnostics: params.diagnostics,
          workspaceSlug: params.workspaceSlug,
        })
      : buildApplicationSkeletonDraftRepairPrompt({
          diagnostics: params.diagnostics,
          workspaceSlug: params.workspaceSlug,
        }),
  phase: params.phase,
  valid: false,
});

export const validateApplicationSkeletonManagedArtifacts = async (
  request: ApplicationSkeletonManagedValidationRequest
): Promise<ApplicationSkeletonManagedValidationResult> => {
  const markdownRelativePath = relativeApplicationSkeletonPath(
    request.workspaceSlug,
    "application-skeleton.md"
  );
  const mapRelativePath = relativeApplicationSkeletonPath(
    request.workspaceSlug,
    "application-skeleton-map.json"
  );
  const [markdown, mapContent] = await Promise.all([
    readRequiredFile(path.join(request.workspaceRoot, markdownRelativePath)),
    readRequiredFile(path.join(request.workspaceRoot, mapRelativePath)),
  ]);
  const parsedMap = parseJsonObject(mapContent);
  const mapJson = parsedMap.value;
  const phase = resolvePhase(mapJson);
  const structuralDiagnostics = [...parsedMap.errors];
  if (!markdown) {
    structuralDiagnostics.push("missing_markdown");
  }
  if (structuralDiagnostics.length > 0) {
    return buildInvalidResult({
      diagnostics: structuralDiagnostics,
      mapJson,
      phase,
      workspaceSlug: request.workspaceSlug,
    });
  }
  if (phase === "draft") {
    const diagnostics = validateDraftShape({ mapJson, markdown });
    return diagnostics.length > 0
      ? buildInvalidResult({
          diagnostics,
          mapJson,
          phase,
          workspaceSlug: request.workspaceSlug,
        })
      : {
          diagnostics: [],
          mapJson,
          nextAction: "open_user_review",
          nextPrompt: buildApplicationSkeletonUserReviewMessage({
            questions: readOpenQuestions(mapJson),
          }),
          phase,
          valid: true,
        };
  }

  const materialization = await validateApplicationSkeletonMaterialization({
    mapJson,
    markdown,
    workspaceRoot: request.workspaceRoot,
  });
  const environmentDiagnostics =
    materialization.validationErrors.length === 0
      ? await auditApplicationSkeletonEnvironmentReadiness({
          mapJson,
          workspaceRoot: request.workspaceRoot,
        })
      : [];
  const diagnostics = [
    ...materialization.validationErrors,
    ...environmentDiagnostics,
  ];
  return diagnostics.length > 0
    ? buildInvalidResult({
        diagnostics,
        mapJson,
        phase,
        workspaceSlug: request.workspaceSlug,
      })
    : {
        diagnostics: [],
        mapJson,
        nextAction: "open_persistent_return",
        nextPrompt: buildApplicationSkeletonPersistentReturnMessage(),
        phase,
        valid: true,
      };
};
