import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../workflow/paths/workflow-artifact-paths";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeModuleNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
} from "./development-tree-types";

export interface DevelopmentTreeSnapshotListenerParams
  extends DevelopmentTreeSnapshotRequest {
  readonly snapshot: DevelopmentTreeSnapshot;
}

export type DevelopmentTreeSnapshotListener = (
  params: DevelopmentTreeSnapshotListenerParams
) => Promise<void> | void;

// Lightweight regex for extracting cluster/module structure from product-part files.
// Intentionally simpler than the full diagram DSL parser: the facade owns the
// current Project Manager read model, not semantic authoring validation.
const createClusterHeaderRegex = (): RegExp =>
  /^###\s+(?:Cluster(?:\s+\d+\.)?:?\s+)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const createModuleRowRegex = (): RegExp =>
  /^\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*([^|\n]+?)\s*\|[ \t]*$/gm;
const STANDALONE_SECTION_RE = /^##\s+(?:Direct\s+)?Standalone\s+Modules/im;
const NEXT_SECTION_SEARCH_RE = /^##\s+/m;

const humanizeKebabId = (id: string): string =>
  id
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

const readExistingFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const extractModuleRows = (
  section: string
): readonly DevelopmentTreeModuleNode[] => {
  const modules: DevelopmentTreeModuleNode[] = [];
  for (const match of section.matchAll(createModuleRowRegex())) {
    const id = match[1]?.trim();
    if (!(id && id !== "module-id")) {
      continue;
    }
    if (!modules.some((module) => module.id === id)) {
      modules.push({ id, title: humanizeKebabId(id) });
    }
  }
  return modules;
};

const clampSectionBody = (body: string): string => {
  const rest = body.slice(1);
  const nextSectionOffset = rest.search(NEXT_SECTION_SEARCH_RE);
  return nextSectionOffset < 0 ? body : body.slice(0, nextSectionOffset + 1);
};

const parseProductPartTree = (
  content: string
): Pick<DevelopmentTreePartNode, "clusters" | "standaloneModules"> => {
  const standaloneSectionStart = content.search(STANDALONE_SECTION_RE);
  const clusters: DevelopmentTreeClusterNode[] = [];
  const clusterHeaders = [...content.matchAll(createClusterHeaderRegex())];
  for (const [index, header] of clusterHeaders.entries()) {
    const clusterId = header[1]?.trim();
    if (!clusterId) {
      continue;
    }
    const start = (header.index ?? 0) + header[0].length;
    const end =
      clusterHeaders[index + 1]?.index ??
      (standaloneSectionStart > start
        ? standaloneSectionStart
        : content.length);
    clusters.push({
      id: clusterId,
      modules: extractModuleRows(content.slice(start, end)),
    });
  }

  const standaloneModules =
    standaloneSectionStart >= 0
      ? extractModuleRows(
          clampSectionBody(content.slice(standaloneSectionStart))
        )
      : [];
  return { clusters, standaloneModules };
};

const createSkeletonPart = (partId: string): DevelopmentTreePartNode => ({
  id: partId,
  status: "skeleton",
  clusters: [],
  standaloneModules: [],
});

const createMaterializedPart = async (
  params: DevelopmentTreeSnapshotRequest,
  partId: string
): Promise<DevelopmentTreePartNode> => {
  const artifactPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
    stage: "diagram_modules",
    fileName: "product-part.md",
    partId,
  });
  if (!artifactPath.ok) {
    return { ...createSkeletonPart(partId), status: "materialized" };
  }

  const content = await readExistingFile(artifactPath.value.absolutePath);
  if (!content) {
    return { ...createSkeletonPart(partId), status: "materialized" };
  }

  return {
    id: partId,
    status: "materialized",
    ...parseProductPartTree(content),
  };
};

export class DevelopmentTreeStateFacade {
  private readonly snapshotListeners: DevelopmentTreeSnapshotListener[] = [];

  subscribeSnapshot(listener: DevelopmentTreeSnapshotListener): () => void {
    this.snapshotListeners.push(listener);
    return () => {
      const index = this.snapshotListeners.indexOf(listener);
      if (index >= 0) {
        this.snapshotListeners.splice(index, 1);
      }
    };
  }

  async currentSnapshot(
    params: DevelopmentTreeSnapshotRequest
  ): Promise<DevelopmentTreeSnapshot> {
    const parts: DevelopmentTreePartNode[] = [];
    for (const partId of params.plannedPartIds) {
      parts.push(
        params.generatedPartIds.includes(partId)
          ? await createMaterializedPart(params, partId)
          : createSkeletonPart(partId)
      );
    }
    const snapshot = { parts };
    for (const listener of this.snapshotListeners) {
      await listener({ ...params, snapshot });
    }
    return snapshot;
  }
}
