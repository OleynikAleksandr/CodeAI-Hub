import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ApplicationSkeletonManagedValidationResult } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import type { Session } from "../../session-manager";

const APPLICATION_SKELETON_STAGE = "application_skeleton";

export const persistApplicationSkeletonManagedDecision = async (params: {
  readonly decision: ApplicationSkeletonManagedValidationResult;
  readonly session: Session;
}): Promise<void> => {
  if (!(params.session.workspacePath && params.session.initiativeSlug)) {
    return;
  }
  const relativePath = `.codeai-hub/${params.session.initiativeSlug}/workflow/managed/application_skeleton.json`;
  const absolutePath = path.join(params.session.workspacePath, relativePath);
  const snapshot = {
    schema: "codeai-managed-workflow-application-skeleton-v1",
    stage: APPLICATION_SKELETON_STAGE,
    sessionId: params.session.id,
    updatedAt: new Date().toISOString(),
    ...params.decision,
    diagnostics: undefined,
    nextPrompt: undefined,
  };
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(snapshot, null, 2)}\n`);
};
