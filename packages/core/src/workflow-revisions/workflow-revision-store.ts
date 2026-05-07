import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  SaveWorkflowRevisionRequest,
  WorkflowRevisionArtifact,
  WorkflowRevisionRecord,
  WorkflowRevisionSnapshot,
  WorkflowRevisionStageId,
  WorkflowRevisionStoreResult,
} from "./workflow-revision-types";

const REVISION_ROOT = ".codeai-hub/workflow/revisions";
const LATEST_FILE_NAME = "latest.json";

const STAGE_DIRECTORY: Record<WorkflowRevisionStageId, string> = {
  application_skeleton: "application-skeleton",
  diagram_modules: "diagram-modules",
  quality_gates: "quality-gates",
};

export class WorkflowRevisionStore {
  async saveAcceptedRevision(
    request: SaveWorkflowRevisionRequest
  ): Promise<WorkflowRevisionStoreResult> {
    const artifacts = [...request.artifacts].sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath)
    );
    const id = createRevisionId(artifacts);
    const snapshot: WorkflowRevisionSnapshot = {
      schema: "codeai-workflow-revision-v1",
      artifacts: artifacts.map((artifact) => ({
        relativePath: normalizeArtifactPath(artifact.relativePath),
        sha256: sha256(artifact.content),
      })),
      createdAt: request.createdAt ?? new Date().toISOString(),
      id,
      metadata: request.metadata ?? {},
      stage: request.stage,
      workspaceSlug: request.workspaceSlug,
    };
    const record: WorkflowRevisionRecord = {
      ...snapshot,
      artifactContents: artifacts.map((artifact) => ({
        content: artifact.content,
        relativePath: normalizeArtifactPath(artifact.relativePath),
      })),
    };

    const relativePath = createRevisionRelativePath(request.stage, id);
    const absolutePath = resolveInsideRoot(request.workspaceRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, serializeRevisionRecord(record), "utf8");
    await writeFile(
      resolveInsideRoot(
        request.workspaceRoot,
        createLatestRelativePath(request.stage)
      ),
      serializeRevisionSnapshot(snapshot),
      "utf8"
    );

    return { absolutePath, relativePath, snapshot };
  }

  async readLatestRevision(params: {
    readonly stage: WorkflowRevisionStageId;
    readonly workspaceRoot: string;
  }): Promise<WorkflowRevisionSnapshot | null> {
    try {
      const latestPath = resolveInsideRoot(
        params.workspaceRoot,
        createLatestRelativePath(params.stage)
      );
      return JSON.parse(await readFile(latestPath, "utf8"));
    } catch {
      return null;
    }
  }
}

const createRevisionRelativePath = (
  stage: WorkflowRevisionStageId,
  id: string
): string =>
  path.posix.join(REVISION_ROOT, STAGE_DIRECTORY[stage], `${id}.json`);

const createLatestRelativePath = (stage: WorkflowRevisionStageId): string =>
  path.posix.join(REVISION_ROOT, STAGE_DIRECTORY[stage], LATEST_FILE_NAME);

const createRevisionId = (
  artifacts: readonly WorkflowRevisionArtifact[]
): string => {
  const input = artifacts
    .map(
      (artifact) =>
        `${normalizeArtifactPath(artifact.relativePath)}\0${sha256(
          artifact.content
        )}`
    )
    .join("\0");
  return sha256(input).slice(0, 16);
};

const normalizeArtifactPath = (relativePath: string): string =>
  path.posix.normalize(relativePath.replace(/\\/g, "/"));

const resolveInsideRoot = (
  workspaceRoot: string,
  relativePath: string
): string => {
  const root = path.resolve(workspaceRoot);
  const absolutePath = path.resolve(root, normalizeArtifactPath(relativePath));
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Unsafe workflow revision path: ${relativePath}`);
  }
  return absolutePath;
};

const serializeRevisionRecord = (record: WorkflowRevisionRecord): string =>
  `${JSON.stringify(record, null, 2)}\n`;

const serializeRevisionSnapshot = (
  snapshot: WorkflowRevisionSnapshot
): string => `${JSON.stringify(snapshot, null, 2)}\n`;

const sha256 = (content: string): string =>
  createHash("sha256").update(content).digest("hex");
