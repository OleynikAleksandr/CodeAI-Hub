import { stat } from "node:fs/promises";
import path from "node:path";
import { buildDescriptionBranchSnapshot } from "./description-step-store";
import type {
  DescriptionBranchSnapshot,
  DescriptionStepSnapshot,
} from "./description-step-types";

const ROOT_DIR = ".codeai-hub";
const DESCRIPTION_DIR = "description";
const CANONICAL_DESCRIPTION_FILES = {
  questionnairePath: "questionnaire.md",
  draftPath: "description.md",
  finalPath: "Final_Description.md",
} as const;

type ArtifactField = keyof typeof CANONICAL_DESCRIPTION_FILES;
type RecoveredArtifact = {
  readonly path: string;
  readonly updatedAt: string;
};

const buildArtifactAbsolutePath = (
  workspaceRoot: string,
  workspaceSlug: string,
  fileName: string
): string =>
  path.join(workspaceRoot, ROOT_DIR, workspaceSlug, DESCRIPTION_DIR, fileName);

const buildArtifactWorkflowPath = (
  workspaceSlug: string,
  fileName: string
): string =>
  path.posix.join(ROOT_DIR, workspaceSlug, DESCRIPTION_DIR, fileName);

const resolveRecoveredArtifact = async (
  workspaceRoot: string,
  workspaceSlug: string,
  field: ArtifactField
): Promise<RecoveredArtifact | null> => {
  const fileName = CANONICAL_DESCRIPTION_FILES[field];
  try {
    const metadata = await stat(
      buildArtifactAbsolutePath(workspaceRoot, workspaceSlug, fileName)
    );
    if (!metadata.isFile()) {
      return null;
    }
    return {
      path: buildArtifactWorkflowPath(workspaceSlug, fileName),
      updatedAt: metadata.mtime.toISOString(),
    };
  } catch {
    return null;
  }
};

const maxTimestamp = (values: Array<string | undefined>): string =>
  values
    .filter((value): value is string => typeof value === "string")
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? new Date().toISOString();

export const recoverDescriptionBranchSnapshot = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly snapshot: DescriptionStepSnapshot | null;
}): Promise<DescriptionBranchSnapshot | null> => {
  const base = options.snapshot
    ? buildDescriptionBranchSnapshot(options.snapshot)
    : null;
  const questionnaireArtifact = base?.questionnairePath
    ? { path: base.questionnairePath, updatedAt: base.updatedAt }
    : await resolveRecoveredArtifact(
        options.workspaceRoot,
        options.workspaceSlug,
        "questionnairePath"
      );
  const draftArtifact = base?.draftPath
    ? { path: base.draftPath, updatedAt: base.updatedAt }
    : await resolveRecoveredArtifact(
        options.workspaceRoot,
        options.workspaceSlug,
        "draftPath"
      );
  const finalArtifact = base?.finalPath
    ? { path: base.finalPath, updatedAt: base.updatedAt }
    : await resolveRecoveredArtifact(
        options.workspaceRoot,
        options.workspaceSlug,
        "finalPath"
      );

  if (!(questionnaireArtifact || draftArtifact || finalArtifact || base)) {
    return null;
  }

  const updatedAt = maxTimestamp([
    base?.updatedAt,
    questionnaireArtifact?.updatedAt,
    draftArtifact?.updatedAt,
    finalArtifact?.updatedAt,
  ]);

  if (base?.finalPath || finalArtifact) {
    return {
      updatedAt,
      finalPath: finalArtifact?.path,
      primarySession: base?.primarySession,
      collectorSession: base?.collectorSession,
      session: base?.session,
      sessionKind: base?.sessionKind,
    };
  }

  return {
    updatedAt,
    questionnairePath: questionnaireArtifact?.path,
    draftPath: draftArtifact?.path,
    primarySession: base?.primarySession,
    collectorSession: base?.collectorSession,
    session: base?.session,
    sessionKind: base?.sessionKind,
  };
};
