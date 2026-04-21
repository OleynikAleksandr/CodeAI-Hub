import { readFile, stat } from "node:fs/promises";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";

// Lightweight regex for extracting cluster/module structure from product-part files.
// Intentionally simpler than the full diagram DSL parser — only IDs and titles.
// Module rows follow the canonical 2-column contract: `| `module-id` | Responsibility |`.
//
// lastIndex safety: do NOT invoke `.exec()` or `.test()` on any module-level /g regex
// singleton here — their `lastIndex` survives across calls in a long-lived Core process
// and produces alternating hit/null results on the same input. Route through
// `.matchAll()` / `.search()` (lastIndex-free) or create a fresh instance per call.
const createClusterHeaderRegex = (): RegExp =>
  /^###\s+(?:Cluster(?:\s+\d+\.)?:?\s+)?`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
// Strict 2-column module row. The second column forbids `|` and newline, so 4-column
// Simple Relations rows (`| from | to | type | label |`) cannot match even if the
// standalone body accidentally overflows past the section boundary.
const createModuleRowRegex = (): RegExp =>
  /^\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*([^|\n]+?)\s*\|[ \t]*$/gm;
const STANDALONE_SECTION_RE = /^##\s+(?:Direct\s+)?Standalone\s+Modules/im;
// Non-global: consumed only through `.search(...)`, so no shared lastIndex state.
const NEXT_SECTION_SEARCH_RE = /^##\s+/m;

// Converts kebab-case identifiers to human-readable Title Case.
// "extension-entry-shell" → "Extension Entry Shell"
const humanizeKebabId = (id: string): string =>
  id
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

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
  for (const match of section.matchAll(createModuleRowRegex())) {
    const id = match[1]?.trim();
    if (!id) {
      continue;
    }
    // Defensive: table header row (`| module-id | Responsibility |`) lacks backticks
    // around `module-id`, so the strict row regex already rejects it — this guard
    // stays as a safety net for legacy artifacts.
    if (id === "module-id") {
      continue;
    }
    if (!modules.some((m) => m.id === id)) {
      modules.push({ id, title: humanizeKebabId(id) });
    }
  }
  return modules;
};

// Clamp the standalone section body to the next top-level `##` header so trailing
// sections (Simple Relations, Assumptions / Open Questions) don't leak their
// rows into the module scanner.
const clampSectionBody = (body: string): string => {
  const rest = body.slice(1);
  const nextSectionOffset = rest.search(NEXT_SECTION_SEARCH_RE);
  if (nextSectionOffset < 0) {
    return body;
  }
  return body.slice(0, nextSectionOffset + 1);
};

const parseProductPartTree = (
  content: string
): Pick<DevelopmentTreePartNode, "clusters" | "standaloneModules"> => {
  const standaloneSectionStart = content.search(STANDALONE_SECTION_RE);

  // Extract clusters with their modules
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
    const clusterBody = content.slice(start, end);
    clusters.push({
      id: clusterId,
      modules: extractModuleRows(clusterBody),
    });
  }

  // Extract standalone modules (scoped to the Standalone section only).
  let standaloneModules: readonly DevelopmentTreeModuleNode[] = [];
  if (standaloneSectionStart >= 0) {
    const standaloneBody = clampSectionBody(
      content.slice(standaloneSectionStart)
    );
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
