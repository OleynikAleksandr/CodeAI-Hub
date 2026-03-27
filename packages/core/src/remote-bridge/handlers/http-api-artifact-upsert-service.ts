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
  return { ok: true, value: { upserts } };
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
    return { ok: true };
  } catch (error) {
    await restoreBackups(backups);
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : null;
};
