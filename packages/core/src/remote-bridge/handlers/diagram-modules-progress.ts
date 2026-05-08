import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import { normalizeAndValidateWorkflowStageArtifact } from "./http-api-artifact-validation";

const PRODUCT_PART_ID_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDERED_ITEM_RE =
  /^(?:\d+\.\s+|###\s+\d+\.\s+)`([a-z0-9]+(?:-[a-z0-9]+)*)`(?:\s+[—-]\s+`[^`]+`)?\s*$/gm;
const PRODUCT_PART_TABLE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`[^`]+`\s*\|\s*.+\|$/gm;
const BLOCKED_AMBIGUITY_RE = /- Status:\s*blocked_ambiguity\b/i;

export type DiagramModulesSubstep =
  | "index"
  | "generate_product_part"
  | "awaiting_review"
  | "blocked_ambiguity";

export interface DiagramModulesProgressSnapshot {
  readonly aggregateReady: boolean;
  readonly currentPartId?: string;
  readonly generatedCount: number;
  readonly generatedPartIds: readonly string[];
  readonly plannedCount: number;
  readonly plannedPartIds: readonly string[];
  readonly productPartDiagnostics?: readonly ProductPartDiagnostic[];
  readonly substep: DiagramModulesSubstep;
}

export interface ProductPartDiagnostic {
  readonly error: string | null;
  readonly partId: string;
  readonly path?: string;
  readonly valid: boolean;
}

const readExistingFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const validateProductPartContent = (params: {
  readonly content: string;
  readonly partId: string;
}): { readonly error: string | null; readonly valid: boolean } => {
  const result = normalizeAndValidateWorkflowStageArtifact({
    expectedPartId: params.partId,
    fileName: "product-part.md",
    markdown: params.content,
  });
  return result.ok
    ? { error: null, valid: true }
    : { error: result.error, valid: false };
};

const collectPlannedPartIds = (markdown: string): string[] => {
  const plannedPartIds: string[] = [];
  for (const pattern of [
    PRODUCT_PART_ID_RE,
    PRODUCT_PART_ORDERED_ITEM_RE,
    PRODUCT_PART_TABLE_ROW_RE,
  ]) {
    for (const match of markdown.matchAll(pattern)) {
      const partId = match[1]?.trim();
      if (!partId || plannedPartIds.includes(partId)) {
        continue;
      }
      plannedPartIds.push(partId);
    }
  }
  return plannedPartIds;
};

const resolveProductPartDiagnostics = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly plannedPartIds: readonly string[];
}): Promise<ProductPartDiagnostic[]> => {
  const diagnostics: ProductPartDiagnostic[] = [];
  for (const partId of params.plannedPartIds) {
    const artifactPath = resolveWorkflowArtifactPaths({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      stage: "diagram_modules",
      fileName: "product-part.md",
      partId,
    });
    if (!artifactPath.ok) {
      diagnostics.push({
        error: artifactPath.error,
        partId,
        valid: false,
      });
      continue;
    }
    const content = await readExistingFile(artifactPath.value.absolutePath);
    if (!content) {
      diagnostics.push({
        error: "Product Part artifact file is missing.",
        partId,
        path: artifactPath.value.relativePath,
        valid: false,
      });
      continue;
    }
    const validation = validateProductPartContent({ content, partId });
    diagnostics.push({
      error: validation.error,
      partId,
      path: artifactPath.value.relativePath,
      valid: validation.valid,
    });
  }
  return diagnostics;
};

export const readDiagramModulesProgressSnapshot = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesProgressSnapshot | null> => {
  const indexPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "diagram_modules",
    fileName: "product-parts.index.md",
  });
  if (!indexPath.ok) {
    return null;
  }

  const indexMarkdown = await readExistingFile(indexPath.value.absolutePath);
  if (!indexMarkdown) {
    return null;
  }

  const plannedPartIds = collectPlannedPartIds(indexMarkdown);
  const productPartDiagnostics = await resolveProductPartDiagnostics({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    plannedPartIds,
  });
  const generatedPartIds = productPartDiagnostics
    .filter((diagnostic) => diagnostic.valid)
    .map((diagnostic) => diagnostic.partId);
  const currentPartId = plannedPartIds.find(
    (partId) => !generatedPartIds.includes(partId)
  );

  let substep: DiagramModulesSubstep = "index";
  if (BLOCKED_AMBIGUITY_RE.test(indexMarkdown)) {
    substep = "blocked_ambiguity";
  } else if (plannedPartIds.length === 0) {
    substep = "index";
  } else if (currentPartId) {
    substep = "generate_product_part";
  } else {
    substep = "awaiting_review";
  }

  return {
    substep,
    plannedPartIds,
    generatedPartIds,
    ...(currentPartId ? { currentPartId } : {}),
    plannedCount: plannedPartIds.length,
    generatedCount: generatedPartIds.length,
    productPartDiagnostics,
    aggregateReady: substep === "awaiting_review",
  };
};
