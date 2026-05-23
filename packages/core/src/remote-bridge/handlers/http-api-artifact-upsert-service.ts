import { WorkflowStepUndoLedgerStore } from "../../workflow/undo/workflow-step-undo-ledger";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import {
  normalizeAndValidateWorkflowStageArtifact,
  normalizeArtifactContent,
} from "./http-api-artifact-validation";
import {
  type ArtifactBackup,
  type ArtifactWriteResult,
  backupAndWriteArtifact,
  readArtifactFile,
  resolveWorkflowStageArtifactTarget,
  restoreBackups,
  type WorkflowSessionContext,
  type WorkflowStageArtifactUpsertPlan,
} from "./http-api-system-routes";

interface ArtifactUpsertItem {
  readonly markdown: string;
  readonly slot: string;
}

const PRODUCT_PART_SLOT_RE =
  /^diagram\.modules\.product-part\.([a-z0-9]+(?:-[a-z0-9]+)*)$/;

type ArtifactUpsertPayloadResult =
  | {
      readonly ok: true;
      readonly value: {
        readonly sessionId: string;
        readonly artifacts: ArtifactUpsertItem[];
      };
    }
  | { readonly ok: false; readonly error: string };

export const parseArtifactUpsertPayload = (
  payload: unknown
): ArtifactUpsertPayloadResult => {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid payload" };
  }
  const candidate = payload as Record<string, unknown>;
  const sessionId = readNonEmptyString(candidate.sessionId);
  if (!sessionId) {
    return { ok: false, error: "Missing sessionId" };
  }
  const artifactsRaw = candidate.artifacts;
  if (!Array.isArray(artifactsRaw)) {
    return { ok: false, error: "Missing artifacts" };
  }
  const artifacts: ArtifactUpsertItem[] = [];
  for (const entry of artifactsRaw) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, error: "Invalid artifact entry" };
    }
    const record = entry as Record<string, unknown>;
    const slot = readNonEmptyString(record.slot);
    const markdown = readNonEmptyString(record.markdown);
    if (!(slot && markdown)) {
      return { ok: false, error: "Invalid artifact entry" };
    }
    artifacts.push({ slot, markdown });
  }
  return { ok: true, value: { sessionId, artifacts } };
};

export const buildWorkflowStageArtifactUpsertPlan = async (params: {
  readonly workspacePath: string;
  readonly sessionContext: WorkflowSessionContext;
  readonly artifacts: readonly ArtifactUpsertItem[];
}): Promise<
  | { readonly ok: true; readonly value: WorkflowStageArtifactUpsertPlan }
  | { readonly ok: false; readonly error: string }
> => {
  const stage = params.sessionContext.stage as WorkflowStageId | null;
  const workspaceSlug = params.sessionContext.initiativeSlug;
  const seenSlots = new Set<string>();
  const upserts: WorkflowStageArtifactUpsertPlan["upserts"][number][] = [];
  for (const artifact of params.artifacts) {
    if (seenSlots.has(artifact.slot)) {
      return { ok: false, error: `Duplicate artifact slot: ${artifact.slot}` };
    }
    seenSlots.add(artifact.slot);
    const targetResult = resolveWorkflowStageArtifactTarget({
      workspacePath: params.workspacePath,
      sessionContext: params.sessionContext,
      slot: artifact.slot,
    });
    if (!targetResult.ok) {
      return { ok: false, error: targetResult.error };
    }
    const contentResult = normalizeAndValidateWorkflowStageArtifact({
      expectedPartId: PRODUCT_PART_SLOT_RE.exec(artifact.slot)?.[1],
      fileName: targetResult.value.fileName,
      markdown: artifact.markdown,
    });
    if (!contentResult.ok) {
      return { ok: false, error: contentResult.error };
    }
    const existingContent = await readArtifactFile(
      targetResult.value.artifactPath
    );
    const normalizedExisting =
      existingContent === null
        ? null
        : normalizeArtifactContent(existingContent);
    upserts.push({
      slot: artifact.slot,
      relativePath: targetResult.value.relativePath,
      artifactPath: targetResult.value.artifactPath,
      content: contentResult.value,
      existingContent,
      changed: normalizedExisting !== contentResult.value,
    });
  }
  return stage && workspaceSlug
    ? {
        ok: true,
        value: {
          stage,
          upserts,
          workspacePath: params.workspacePath,
          workspaceSlug,
        },
      }
    : { ok: false, error: "Session context is missing initiativeSlug/stage" };
};

export const writeArtifactUpsertPlan = async (
  plan: WorkflowStageArtifactUpsertPlan
): Promise<ArtifactWriteResult> => {
  const backups: ArtifactBackup[] = [];
  try {
    for (const upsert of plan.upserts) {
      if (!upsert.changed) {
        continue;
      }
      backups.push(
        await backupAndWriteArtifact(
          upsert.artifactPath,
          upsert.content,
          upsert.existingContent
        )
      );
    }
    await recordUndoEntries(plan);
    return { ok: true };
  } catch (error) {
    await restoreBackups(backups);
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

const recordUndoEntries = async (
  plan: WorkflowStageArtifactUpsertPlan
): Promise<void> => {
  const entries = plan.upserts
    .filter((upsert) => upsert.changed)
    .map((upsert) => ({
      kind: "write_file" as const,
      relativePath: upsert.relativePath,
      source: "artifact_upsert",
      stage: plan.stage,
    }));
  if (entries.length === 0) {
    return;
  }
  await new WorkflowStepUndoLedgerStore({
    workspaceRoot: plan.workspacePath,
    workspaceSlug: plan.workspaceSlug,
  }).append(entries);
};

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};
