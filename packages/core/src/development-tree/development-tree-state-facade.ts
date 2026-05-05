import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ContinuityChainSummary } from "../session-continuity/continuity-types";
import { SessionContinuityFacade } from "../session-continuity/session-continuity-facade";
import { resolveWorkflowArtifactPaths } from "../workflow/paths/workflow-artifact-paths";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreeDraftReadiness,
  DevelopmentTreeDraftReadinessKind,
  DevelopmentTreeModuleNode,
  DevelopmentTreeNodeArtifact,
  DevelopmentTreeNodeSession,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
  DevelopmentTreeSnapshotRequest,
} from "./development-tree-types";
import { createDevelopmentTreeMaterializedRoot } from "./filesystem-structurator/development-tree-filesystem-paths";
import { DraftReadinessClassifier } from "./node-bootstrap/draft-readiness-classifier";

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
const DRAFT_FILES = {
  cluster: ["ClusterDescription.draft.md", "ClusterFacadeContract.draft.md"],
  module: ["ModuleSpec.draft.md", "ModuleFacadeContract.draft.md"],
  product_part: ["PartDescription.draft.md"],
} as const satisfies Record<
  DevelopmentTreeDraftReadinessKind,
  readonly string[]
>;

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

const fileExists = async (absolutePath: string): Promise<boolean> =>
  Boolean((await stat(absolutePath).catch(() => null))?.isFile());

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

const aggregateReadiness = (
  self: DevelopmentTreeDraftReadiness,
  children: readonly DevelopmentTreeDraftReadiness[]
): DevelopmentTreeDraftReadiness => {
  const values = [self, ...children];
  if (values.every((value) => value === "ready")) {
    return "ready";
  }
  if (values.every((value) => value === "idle")) {
    return "idle";
  }
  return "in_progress";
};

const readDraftFiles = async (params: {
  readonly folderAbsolutePath: string;
  readonly kind: DevelopmentTreeDraftReadinessKind;
}): Promise<
  readonly { readonly content: string; readonly fileName: string }[]
> => {
  const files: Array<{ readonly content: string; readonly fileName: string }> =
    [];
  for (const fileName of DRAFT_FILES[params.kind]) {
    const content = await readExistingFile(
      path.join(params.folderAbsolutePath, fileName)
    );
    if (content) {
      files.push({ fileName, content });
    }
  }
  return files;
};

const createReadinessReader = (params: DevelopmentTreeSnapshotRequest) => {
  const classifier = new DraftReadinessClassifier();
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  return async (options: {
    readonly clusterId?: string;
    readonly kind: DevelopmentTreeDraftReadinessKind;
    readonly moduleId?: string;
    readonly partId: string;
  }): Promise<DevelopmentTreeDraftReadiness> => {
    const folderSegments = createReadinessFolderSegments(options);
    return classifier.classify({
      kind: options.kind,
      files: await readDraftFiles({
        folderAbsolutePath: path.join(root.absolutePath, ...folderSegments),
        kind: options.kind,
      }),
    }).readiness;
  };
};

const createReadinessFolderSegments = (options: {
  readonly clusterId?: string;
  readonly kind: DevelopmentTreeDraftReadinessKind;
  readonly moduleId?: string;
  readonly partId: string;
}): readonly string[] => {
  if (options.kind === "product_part") {
    return ["product-parts", options.partId];
  }
  if (options.kind === "cluster") {
    return [
      "product-parts",
      options.partId,
      "clusters",
      options.clusterId ?? "",
    ];
  }
  if (options.clusterId) {
    return [
      "product-parts",
      options.partId,
      "clusters",
      options.clusterId,
      "modules",
      options.moduleId ?? "",
    ];
  }
  return ["product-parts", options.partId, "modules", options.moduleId ?? ""];
};

const createNodeWorkflowPath = (options: {
  readonly clusterId?: string;
  readonly kind: DevelopmentTreeDraftReadinessKind;
  readonly moduleId?: string;
  readonly partId: string;
}): string =>
  path.posix.join(
    "development_tree",
    "materialized",
    ...createReadinessFolderSegments(options)
  );

const resolveLatestNodeSession = (
  chains: readonly ContinuityChainSummary[],
  workflowPath: string
): DevelopmentTreeNodeSession | undefined => {
  let best: DevelopmentTreeNodeSession | undefined;
  for (const chain of chains) {
    if (chain.stage !== workflowPath) {
      continue;
    }
    const last = chain.segments.at(-1);
    if (!last) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = {
        dialogId: chain.dialogId ?? chain.rootSessionId,
        providerId: last.providerId,
        providerSessionId: last.providerSessionId,
        rootSessionId: chain.rootSessionId,
        sessionId: last.sessionId,
        updatedAt: chain.updatedAt,
      };
    }
  }
  return best;
};

const createMetadataReader = async (params: DevelopmentTreeSnapshotRequest) => {
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  const chains = await SessionContinuityFacade.readWorkspaceChains(params);
  return async (options: {
    readonly clusterId?: string;
    readonly kind: DevelopmentTreeDraftReadinessKind;
    readonly moduleId?: string;
    readonly partId: string;
  }): Promise<{
    readonly artifacts: readonly DevelopmentTreeNodeArtifact[];
    readonly session?: DevelopmentTreeNodeSession;
    readonly workflowPath: string;
  }> => {
    const folderSegments = createReadinessFolderSegments(options);
    const workflowPath = createNodeWorkflowPath(options);
    const artifacts: DevelopmentTreeNodeArtifact[] = [];
    for (const fileName of DRAFT_FILES[options.kind]) {
      if (
        await fileExists(
          path.join(root.absolutePath, ...folderSegments, fileName)
        )
      ) {
        artifacts.push({
          fileName,
          path: path.posix.join(
            ".codeai-hub",
            params.workspaceSlug,
            workflowPath,
            fileName
          ),
        });
      }
    }
    return {
      artifacts,
      workflowPath,
      session: resolveLatestNodeSession(chains, workflowPath),
    };
  };
};

const applyReadiness = async (
  part: DevelopmentTreePartNode,
  params: DevelopmentTreeSnapshotRequest,
  readMetadata: Awaited<ReturnType<typeof createMetadataReader>>
): Promise<DevelopmentTreePartNode> => {
  const readReadiness = createReadinessReader(params);
  const clusters: DevelopmentTreeClusterNode[] = [];
  for (const cluster of part.clusters) {
    const modules: DevelopmentTreeModuleNode[] = [];
    for (const module of cluster.modules) {
      const metadata = await readMetadata({
        kind: "module",
        partId: part.id,
        clusterId: cluster.id,
        moduleId: module.id,
      });
      modules.push({
        ...module,
        ...metadata,
        readiness: await readReadiness({
          kind: "module",
          partId: part.id,
          clusterId: cluster.id,
          moduleId: module.id,
        }),
      });
    }
    const metadata = await readMetadata({
      kind: "cluster",
      partId: part.id,
      clusterId: cluster.id,
    });
    const selfReadiness = await readReadiness({
      kind: "cluster",
      partId: part.id,
      clusterId: cluster.id,
    });
    clusters.push({
      ...cluster,
      ...metadata,
      modules,
      readiness: aggregateReadiness(
        selfReadiness,
        modules.map((module) => module.readiness ?? "idle")
      ),
    });
  }

  const standaloneModules: DevelopmentTreeModuleNode[] = [];
  for (const module of part.standaloneModules) {
    const metadata = await readMetadata({
      kind: "module",
      partId: part.id,
      moduleId: module.id,
    });
    standaloneModules.push({
      ...module,
      ...metadata,
      readiness: await readReadiness({
        kind: "module",
        partId: part.id,
        moduleId: module.id,
      }),
    });
  }
  const metadata = await readMetadata({
    kind: "product_part",
    partId: part.id,
  });
  const selfReadiness = await readReadiness({
    kind: "product_part",
    partId: part.id,
  });
  return {
    ...part,
    ...metadata,
    clusters,
    standaloneModules,
    readiness: aggregateReadiness(selfReadiness, [
      ...clusters.map((cluster) => cluster.readiness ?? "idle"),
      ...standaloneModules.map((module) => module.readiness ?? "idle"),
    ]),
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
    const readMetadata = await createMetadataReader(params);
    for (const partId of params.plannedPartIds) {
      parts.push(
        await applyReadiness(
          params.generatedPartIds.includes(partId)
            ? await createMaterializedPart(params, partId)
            : createSkeletonPart(partId),
          params,
          readMetadata
        )
      );
    }
    const snapshot = { parts };
    for (const listener of this.snapshotListeners) {
      await listener({ ...params, snapshot });
    }
    return snapshot;
  }
}
