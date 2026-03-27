import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

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
  readonly substep: DiagramModulesSubstep;
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

const resolveGeneratedPartIds = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly plannedPartIds: readonly string[];
}): Promise<string[]> => {
  const generatedPartIds: string[] = [];
  for (const partId of params.plannedPartIds) {
    const artifactPath = resolveWorkflowArtifactPaths({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      stage: "diagram_modules",
      fileName: "product-part.md",
      partId,
    });
    if (!artifactPath.ok) {
      continue;
    }
    const content = await readExistingFile(artifactPath.value.absolutePath);
    if (content) {
      generatedPartIds.push(partId);
    }
  }
  return generatedPartIds;
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
  const generatedPartIds = await resolveGeneratedPartIds({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    plannedPartIds,
  });
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
    aggregateReady: false,
  };
};
