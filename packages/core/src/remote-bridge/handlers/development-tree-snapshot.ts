import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

// Lightweight regex for extracting cluster/module structure from product-part files.
// Intentionally simpler than the full diagram DSL parser — only IDs and titles.
const CLUSTER_HEADER_RE =
  /^###\s+(?:Cluster(?:\s+\d+\.)?:?\s+)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const MODULE_ROW_RE =
  /^\|\s*(?:\d+\s*\|\s*)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`([^`]+)`\s*\|/gm;
const STANDALONE_SECTION_RE = /^##\s+(?:Direct\s+)?Standalone\s+Modules/im;

export interface DevelopmentTreeModuleNode {
  readonly id: string;
  readonly title: string;
}

export interface DevelopmentTreeClusterNode {
  readonly id: string;
  readonly modules: readonly DevelopmentTreeModuleNode[];
}

export interface DevelopmentTreePartNode {
  readonly clusters: readonly DevelopmentTreeClusterNode[];
  readonly id: string;
  readonly standaloneModules: readonly DevelopmentTreeModuleNode[];
  readonly status: "skeleton" | "materialized";
}

export interface DevelopmentTreeSnapshot {
  readonly parts: readonly DevelopmentTreePartNode[];
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

const extractModuleRows = (
  section: string
): readonly DevelopmentTreeModuleNode[] => {
  const modules: DevelopmentTreeModuleNode[] = [];
  for (const match of section.matchAll(MODULE_ROW_RE)) {
    const id = match[1]?.trim();
    const title = match[2]?.trim();
    if (id && title && !modules.some((m) => m.id === id)) {
      modules.push({ id, title });
    }
  }
  return modules;
};

const parseProductPartTree = (
  content: string
): Pick<DevelopmentTreePartNode, "clusters" | "standaloneModules"> => {
  const standaloneSectionStart = content.search(STANDALONE_SECTION_RE);

  // Extract clusters with their modules
  const clusters: DevelopmentTreeClusterNode[] = [];
  const clusterHeaders = [...content.matchAll(CLUSTER_HEADER_RE)];
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
    const clusterBody = content.slice(start, end);
    clusters.push({
      id: clusterId,
      modules: extractModuleRows(clusterBody),
    });
  }

  // Extract standalone modules
  let standaloneModules: readonly DevelopmentTreeModuleNode[] = [];
  if (standaloneSectionStart >= 0) {
    const standaloneBody = content.slice(standaloneSectionStart);
    standaloneModules = extractModuleRows(standaloneBody);
  }

  return { clusters, standaloneModules };
};

export const readDevelopmentTreeSnapshot = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly plannedPartIds: readonly string[];
  readonly generatedPartIds: readonly string[];
}): Promise<DevelopmentTreeSnapshot> => {
  const parts: DevelopmentTreePartNode[] = [];

  for (const partId of params.plannedPartIds) {
    const isGenerated = params.generatedPartIds.includes(partId);
    if (!isGenerated) {
      parts.push({
        id: partId,
        status: "skeleton",
        clusters: [],
        standaloneModules: [],
      });
      continue;
    }

    const artifactPath = resolveWorkflowArtifactPaths({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
      stage: "diagram_modules",
      fileName: "product-part.md",
      partId,
    });
    if (!artifactPath.ok) {
      parts.push({
        id: partId,
        status: "materialized",
        clusters: [],
        standaloneModules: [],
      });
      continue;
    }

    const content = await readExistingFile(artifactPath.value.absolutePath);
    if (!content) {
      parts.push({
        id: partId,
        status: "materialized",
        clusters: [],
        standaloneModules: [],
      });
      continue;
    }

    const tree = parseProductPartTree(content);
    parts.push({
      id: partId,
      status: "materialized",
      ...tree,
    });
  }

  return { parts };
};
