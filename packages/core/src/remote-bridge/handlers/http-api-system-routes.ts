import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Response } from "express";
import type { WorkflowArtifactFileName } from "./http-api-artifact-validation";
import type { RouterDependencies } from "./http-api-router";
import { buildDescriptionContract } from "./idea-contract-service";

export const HTTP_INTERNAL_ERROR = 500;
export const HTTP_NOT_FOUND = 404;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NO_CONTENT = 204;

const DESCRIPTION_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/description\/Final_Description\.md$/;
const VIRTUAL_SIMULATION_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/virtual_simulation\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?virtual-simulation\.md$/;
const DIAGRAM_MODULES_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/diagram_modules\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?(?:(?:product-parts\.index\.md)|(?:product-parts\/[a-z0-9]+(?:-[a-z0-9]+)*\.md)|(?:module-map\.flow\.json))$/;
const FOUNDATION_ENVELOPE_PATH_RE =
  /^\.codeai-hub\/[a-z0-9]+(?:-[a-z0-9]+)*\/foundation_envelope\/(?:runs\/[a-z0-9]+(?:-[a-z0-9]+)*\/)?(?:foundation-envelope\.md|foundation-envelope\.flow\.json)$/;
const PRODUCT_PART_SLOT_RE =
  /^diagram\.modules\.product-part\.([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORKFLOW_STAGE_SLOTS = new Map<
  string,
  { stage: WorkflowStageId; fileName: WorkflowArtifactFileName }
>([
  [
    "workspace.description",
    { stage: "description", fileName: "Final_Description.md" },
  ],
  [
    "workspace.virtual_simulation",
    { stage: "virtual_simulation", fileName: "virtual-simulation.md" },
  ],
  [
    "diagram.modules.index",
    { stage: "diagram_modules", fileName: "product-parts.index.md" },
  ],
  [
    "diagram.modules.flow",
    { stage: "diagram_modules", fileName: "module-map.flow.json" },
  ],
  [
    "workspace.foundation_envelope",
    {
      stage: "foundation_envelope",
      fileName: "foundation-envelope.md",
    },
  ],
  [
    "workspace.foundation_envelope.flow",
    {
      stage: "foundation_envelope",
      fileName: "foundation-envelope.flow.json",
    },
  ],
]);
const WORKFLOW_STAGE_PATHS = new Map<WorkflowStageId, RegExp>([
  ["description", DESCRIPTION_PATH_RE],
  ["virtual_simulation", VIRTUAL_SIMULATION_PATH_RE],
  ["diagram_modules", DIAGRAM_MODULES_PATH_RE],
  ["foundation_envelope", FOUNDATION_ENVELOPE_PATH_RE],
]);

type WorkflowStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "foundation_envelope";
type WorkflowParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };
export type ArtifactWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: Error };

export interface ArtifactBackup {
  readonly backupPath: string | null;
  readonly path: string;
  readonly previousContent: string | null;
}

export interface WorkflowSessionContext {
  readonly initiativeSlug: string | null;
  readonly runSlug: string | null;
  readonly stage: string | null;
}

export interface WorkflowStageArtifactUpsertPlan {
  readonly upserts: readonly {
    readonly slot: string;
    readonly relativePath: string;
    readonly artifactPath: string;
    readonly content: string;
    readonly existingContent: string | null;
    readonly changed: boolean;
  }[];
}

interface WorkflowStageArtifactTarget {
  readonly artifactPath: string;
  readonly fileName: WorkflowArtifactFileName;
  readonly relativePath: string;
}

export const handleFileDropCollect = async (
  deps: RouterDependencies,
  res: Response
): Promise<void> => {
  try {
    const snapshot = await deps.fileDropService.collect();
    if (!snapshot) {
      res.status(HTTP_NO_CONTENT).end();
      return;
    }
    res.json({ paths: snapshot.paths, formatted: snapshot.formatted });
  } catch (error) {
    deps.logger.error("File drop capture failed", error as Error);
    res
      .status(HTTP_INTERNAL_ERROR)
      .json({ error: "Unable to capture file drop data" });
  }
};

export const handleIdeaContract = async (
  deps: RouterDependencies,
  res: Response
): Promise<void> => {
  res.setHeader("X-CodeAI-Legacy-Alias", "description-contract");
  await handleWorkflowContract(
    deps,
    res,
    buildDescriptionContract,
    "Description"
  );
};

export const handleWorkflowContract = async (
  deps: RouterDependencies,
  res: Response,
  builder: () => Promise<unknown>,
  label: string
): Promise<void> => {
  try {
    const contract = await builder();
    if (!contract) {
      res.status(HTTP_NOT_FOUND).json({
        error: `${label} contract templates are unavailable`,
      });
      return;
    }
    res.json(contract);
  } catch (error) {
    deps.logger.error(`${label} contract build failed`, error as Error);
    res.status(HTTP_INTERNAL_ERROR).json({
      error: `Unable to build ${label.toLowerCase()} contract`,
    });
  }
};

export const resolveWorkflowStageArtifactTarget = (params: {
  readonly slot: string;
  readonly workspacePath: string;
  readonly sessionContext: WorkflowSessionContext;
}): WorkflowParseResult<WorkflowStageArtifactTarget> => {
  const { initiativeSlug, stage } = params.sessionContext;
  if (!(initiativeSlug && stage)) {
    return {
      ok: false,
      error: "Session context is missing initiativeSlug/stage",
    };
  }
  if (
    !(
      stage === "description" ||
      stage === "virtual_simulation" ||
      stage === "diagram_modules" ||
      stage === "foundation_envelope"
    )
  ) {
    return { ok: false, error: `Unsupported stage: ${stage}` };
  }
  if (!SLUG_RE.test(initiativeSlug)) {
    return { ok: false, error: "Invalid initiativeSlug" };
  }
  const workspaceRoot = path.resolve(params.workspacePath);
  const partId =
    stage === "diagram_modules"
      ? PRODUCT_PART_SLOT_RE.exec(params.slot)?.[1]
      : null;
  const relativePath = partId
    ? `.codeai-hub/${initiativeSlug}/diagram_modules/product-parts/${partId}.md`
    : resolveWorkflowStageRelativePath(
        params.slot,
        stage as WorkflowStageId,
        initiativeSlug
      );
  if (!relativePath) {
    return { ok: false, error: `Unsupported artifact slot: ${params.slot}` };
  }
  const fileName = partId
    ? "product-part.md"
    : (WORKFLOW_STAGE_SLOTS.get(params.slot)?.fileName ?? null);
  if (!fileName) {
    return { ok: false, error: "Unsupported artifact file" };
  }
  const pathMatcher = WORKFLOW_STAGE_PATHS.get(stage as WorkflowStageId);
  if (!(pathMatcher?.test(relativePath) ?? false)) {
    return { ok: false, error: "Invalid artifact path" };
  }
  const artifactPath = resolveArtifactPath(workspaceRoot, relativePath);
  return artifactPath
    ? { ok: true, value: { artifactPath, fileName, relativePath } }
    : { ok: false, error: "Unsafe artifact path" };
};

export const readArtifactFile = async (
  artifactPath: string
): Promise<string | null> => {
  try {
    return await readFile(artifactPath, { encoding: "utf8" });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null
        ? (error as { code?: string }).code
        : null;
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const backupAndWriteArtifact = async (
  artifactPath: string,
  content: string,
  existingContent: string | null
): Promise<ArtifactBackup> => {
  const backupPath =
    existingContent === null
      ? null
      : `${artifactPath}.bak-${new Date().toISOString().replace(/[^\d]/g, "")}`;
  if (backupPath && existingContent !== null) {
    await writeFile(backupPath, existingContent, { encoding: "utf8" });
  }
  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, content, { encoding: "utf8" });
  return { path: artifactPath, previousContent: existingContent, backupPath };
};

export const restoreBackups = async (
  backups: readonly ArtifactBackup[]
): Promise<void> => {
  for (const backup of backups) {
    if (backup.previousContent === null) {
      continue;
    }
    await mkdir(path.dirname(backup.path), { recursive: true });
    await writeFile(backup.path, backup.previousContent, { encoding: "utf8" });
  }
};

const resolveWorkflowStageRelativePath = (
  slot: string,
  stage: WorkflowStageId,
  initiativeSlug: string
): string | null => {
  const slotInfo = WORKFLOW_STAGE_SLOTS.get(slot);
  if (!slotInfo) {
    return null;
  }
  if (slotInfo.stage !== stage) {
    return null;
  }
  return `.codeai-hub/${initiativeSlug}/${slotInfo.stage}/${slotInfo.fileName}`;
};

const resolveArtifactPath = (
  workspaceRoot: string,
  relativePath: string
): string | null => {
  const artifactPath = path.resolve(workspaceRoot, relativePath);
  return artifactPath.startsWith(`${workspaceRoot}${path.sep}`)
    ? artifactPath
    : null;
};
