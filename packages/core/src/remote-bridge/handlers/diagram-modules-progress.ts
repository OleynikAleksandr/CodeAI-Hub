import { execFile } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { readDiagramModulesLeadershipContract } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-validator";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import { normalizeAndValidateWorkflowStageArtifact } from "./http-api-artifact-validation";

const execFileAsync = promisify(execFile);
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
  readonly acceptedPartIds?: readonly string[];
  readonly activeSubturn?: DiagramModulesSubturnProgress;
  readonly aggregateReady: boolean;
  readonly currentPartId?: string;
  readonly expectedArtifactPath?: string | null;
  readonly generatedCount: number;
  readonly generatedPartIds: readonly string[];
  readonly lastValidation?: DiagramModulesValidationSnapshot | null;
  readonly leadProductPartId?: string | null;
  readonly nextPartId?: string | null;
  readonly plannedCount: number;
  readonly plannedPartIds: readonly string[];
  readonly productPartDiagnostics?: readonly ProductPartDiagnostic[];
  readonly productPartLeadershipOrder?: readonly string[];
  readonly substep: DiagramModulesSubstep;
}

export type DiagramModulesSubturnProgress =
  | {
      readonly kind: "index";
      readonly status: "accepted" | "pending" | "repair_pending";
    }
  | {
      readonly kind: "product_part";
      readonly partId: string;
      readonly status: "accepted" | "pending" | "repair_pending";
    }
  | { readonly kind: "aggregate"; readonly status: "accepted" };

export interface DiagramModulesValidationSnapshot {
  readonly diagnostics: readonly string[];
  readonly expectedArtifactPath: string | null;
  readonly valid: boolean;
  readonly validator: string;
}

export interface DiagramModulesPersistedSubturnState {
  readonly acceptedPartIds: readonly string[];
  readonly activeSubturn: DiagramModulesSubturnProgress;
  readonly expectedArtifactPath: string | null;
  readonly lastValidation: DiagramModulesValidationSnapshot | null;
  readonly nextPartId: string | null;
  readonly schema: "codeai-diagram-modules-subturn-v1";
  readonly stage: "diagram_modules";
  readonly updatedAt: string;
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

const resolveSubturnStatePath = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = `.codeai-hub/${params.workspaceSlug}/workflow/diagram-modules-progress.json`;
  return {
    absolutePath: path.join(params.workspaceRoot, relativePath),
    relativePath,
  };
};

const resolveLegacySubturnStatePath = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): { readonly absolutePath: string; readonly relativePath: string } => {
  const relativePath = `.codeai-hub/${params.workspaceSlug}/workflow/state.json`;
  return {
    absolutePath: path.join(params.workspaceRoot, relativePath),
    relativePath,
  };
};

const isDiagramModulesPersistedSubturnState = (
  value: unknown
): value is DiagramModulesPersistedSubturnState =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value as { readonly schema?: unknown }).schema ===
    "codeai-diagram-modules-subturn-v1" &&
  (value as { readonly stage?: unknown }).stage === "diagram_modules";

export const readDiagramModulesPersistedSubturnState = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesPersistedSubturnState | null> => {
  for (const statePath of [
    resolveSubturnStatePath(params),
    resolveLegacySubturnStatePath(params),
  ]) {
    const content = await readExistingFile(statePath.absolutePath);
    if (!content) {
      continue;
    }
    try {
      const parsed = JSON.parse(content) as unknown;
      if (isDiagramModulesPersistedSubturnState(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore corrupt legacy progress snapshots and try the next location.
    }
  }
  return null;
};

export const syncDiagramModulesSubturnState = async (params: {
  readonly progress: DiagramModulesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DiagramModulesPersistedSubturnState | null> => {
  if (!params.progress) {
    return null;
  }
  if (!params.progress.activeSubturn) {
    return null;
  }
  const statePath = resolveSubturnStatePath(params);
  const state: DiagramModulesPersistedSubturnState = {
    schema: "codeai-diagram-modules-subturn-v1",
    stage: "diagram_modules",
    updatedAt: new Date().toISOString(),
    activeSubturn: params.progress.activeSubturn,
    acceptedPartIds: params.progress.acceptedPartIds ?? [],
    expectedArtifactPath: params.progress.expectedArtifactPath ?? null,
    lastValidation: params.progress.lastValidation ?? null,
    nextPartId: params.progress.nextPartId ?? null,
  };
  await mkdir(path.dirname(statePath.absolutePath), { recursive: true });
  await writeFile(
    statePath.absolutePath,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8"
  );
  return state;
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

const PRODUCT_PART_MISSING_FILE_ERROR =
  "Product Part artifact file is missing.";

const resolveActiveSubturn = (params: {
  readonly blockedAmbiguity: boolean;
  readonly currentDiagnostic: ProductPartDiagnostic | null;
  readonly currentPartId: string | undefined;
  readonly generatedPartIds: readonly string[];
  readonly indexDiagnostics: readonly string[];
  readonly indexDirty: boolean;
  readonly plannedPartIds: readonly string[];
}): DiagramModulesSubturnProgress => {
  if (
    params.blockedAmbiguity ||
    params.plannedPartIds.length === 0 ||
    params.indexDiagnostics.length > 0
  ) {
    return {
      kind: "index",
      status:
        params.blockedAmbiguity || params.indexDiagnostics.length > 0
          ? "repair_pending"
          : "pending",
    };
  }
  if (params.indexDirty) {
    return { kind: "index", status: "pending" };
  }
  if (!params.currentPartId) {
    return { kind: "aggregate", status: "accepted" };
  }
  if (params.generatedPartIds.includes(params.currentPartId)) {
    return {
      kind: "product_part",
      partId: params.currentPartId,
      status: "accepted",
    };
  }
  return {
    kind: "product_part",
    partId: params.currentPartId,
    status:
      params.currentDiagnostic?.error === PRODUCT_PART_MISSING_FILE_ERROR
        ? "pending"
        : "repair_pending",
  };
};

const resolveIndexDiagnostics = (params: {
  readonly indexDiagnostics: readonly string[];
  readonly plannedPartIds: readonly string[];
}): readonly string[] => {
  if (params.indexDiagnostics.length > 0) {
    return params.indexDiagnostics;
  }
  return params.plannedPartIds.length > 0
    ? []
    : ["Diagram Modules index does not declare any Product Part ids."];
};

const resolveLastValidation = (params: {
  readonly activeSubturn: DiagramModulesSubturnProgress;
  readonly currentDiagnostic: ProductPartDiagnostic | null;
  readonly indexDiagnostics: readonly string[];
  readonly indexRelativePath: string;
  readonly plannedPartIds: readonly string[];
}): DiagramModulesValidationSnapshot | null => {
  if (params.activeSubturn.kind === "aggregate") {
    return {
      diagnostics: [],
      expectedArtifactPath: null,
      valid: true,
      validator: "diagram_modules.aggregate",
    };
  }
  if (params.activeSubturn.kind === "index") {
    return {
      diagnostics: resolveIndexDiagnostics({
        indexDiagnostics: params.indexDiagnostics,
        plannedPartIds: params.plannedPartIds,
      }),
      expectedArtifactPath: params.indexRelativePath,
      valid:
        params.plannedPartIds.length > 0 &&
        params.indexDiagnostics.length === 0 &&
        params.activeSubturn.status === "accepted",
      validator: "diagram_modules.index",
    };
  }
  if (!params.currentDiagnostic) {
    return null;
  }
  return {
    diagnostics: params.currentDiagnostic.error
      ? [params.currentDiagnostic.error]
      : [],
    expectedArtifactPath: params.currentDiagnostic.path ?? null,
    valid: params.currentDiagnostic.valid,
    validator: "diagram_modules.product_part",
  };
};

const isGitPathDirty = async (params: {
  readonly relativePath: string;
  readonly workspaceRoot: string;
}): Promise<boolean> => {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["status", "--short", "--untracked-files=all", "--", params.relativePath],
      { cwd: params.workspaceRoot }
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
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
  const leadership = readDiagramModulesLeadershipContract({
    markdown: indexMarkdown,
    plannedPartIds,
  });
  const indexDiagnostics = leadership.diagnostics;
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
  const currentDiagnostic =
    productPartDiagnostics.find(
      (diagnostic) => diagnostic.partId === currentPartId
    ) ?? null;
  const blockedAmbiguity = BLOCKED_AMBIGUITY_RE.test(indexMarkdown);
  const indexDirty = await isGitPathDirty({
    relativePath: indexPath.value.relativePath,
    workspaceRoot: params.workspaceRoot,
  });
  const activeSubturn = resolveActiveSubturn({
    blockedAmbiguity,
    currentDiagnostic,
    currentPartId,
    generatedPartIds,
    indexDiagnostics,
    indexDirty,
    plannedPartIds,
  });
  const lastValidation = resolveLastValidation({
    activeSubturn,
    currentDiagnostic,
    indexDiagnostics,
    indexRelativePath: indexPath.value.relativePath,
    plannedPartIds,
  });

  let substep: DiagramModulesSubstep = "index";
  if (blockedAmbiguity) {
    substep = "blocked_ambiguity";
  } else if (
    plannedPartIds.length === 0 ||
    indexDirty ||
    indexDiagnostics.length > 0
  ) {
    substep = "index";
  } else if (currentPartId) {
    substep = "generate_product_part";
  } else {
    substep = "awaiting_review";
  }

  return {
    acceptedPartIds: generatedPartIds,
    activeSubturn,
    substep,
    plannedPartIds,
    generatedPartIds,
    ...(currentPartId ? { currentPartId } : {}),
    expectedArtifactPath: lastValidation?.expectedArtifactPath ?? null,
    lastValidation,
    leadProductPartId: leadership.leadProductPartId,
    nextPartId: currentPartId ?? null,
    plannedCount: plannedPartIds.length,
    generatedCount: generatedPartIds.length,
    productPartLeadershipOrder: leadership.productPartLeadershipOrder,
    productPartDiagnostics,
    aggregateReady: substep === "awaiting_review",
  };
};
