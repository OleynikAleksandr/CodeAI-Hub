import type {
  ClusterEntity,
  MarkdownDslParseError,
  MarkdownDslParseWarning,
  ModuleEntity,
  ModuleMapModel,
  ProductPartEntity,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { computeDiagramRevision } from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";

const INVENTORY_TITLE_RE = /^# Module Inventory$/m;
const PRODUCT_PART_TITLE_RE = /^Product Part:\s*`([^`]+)`\s*$/m;
const SECTION_RE = /^## (.+)$/gm;
const TABLE_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/gm;
const CLUSTER_HEADER_RE =
  /^### Cluster(?: \d+\.)?\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const PURPOSE_RE = /^\*\*Purpose:\*\*\s+(.+)$/m;
const MODULE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/gm;

type MaterializedStagedProductPartResult =
  | {
      readonly ok: true;
      readonly value: ModuleMapModel;
      readonly content: string;
      readonly warnings: readonly MarkdownDslParseWarning[];
    }
  | {
      readonly ok: false;
      readonly error: MarkdownDslParseError;
      readonly warnings: readonly MarkdownDslParseWarning[];
    };

type SectionBlock = {
  readonly body: string;
  readonly line: number;
};

const buildFailure = (
  code: MarkdownDslParseError["code"],
  line: number,
  message: string
): MaterializedStagedProductPartResult => ({
  ok: false,
  error: { code, line, message },
  warnings: [],
});

const lineOf = (content: string, index: number): number =>
  content.slice(0, Math.max(0, index)).split(/\r?\n/u).length;

const normalizeCell = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const collectSections = (content: string): ReadonlyMap<string, SectionBlock> => {
  const sections = new Map<string, SectionBlock>();
  const matches = [...content.matchAll(SECTION_RE)];
  for (const [index, match] of matches.entries()) {
    const sectionName = match[1]?.trim();
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? content.length;
    if (!sectionName) {
      continue;
    }
    sections.set(sectionName, {
      body: content.slice(start, end).trim(),
      line: lineOf(content, match.index ?? 0),
    });
  }
  return sections;
};

const parseFieldTable = (section: SectionBlock): ReadonlyMap<string, string> => {
  const fields = new Map<string, string>();
  for (const match of section.body.matchAll(TABLE_ROW_RE)) {
    const key = normalizeCell(match[1] ?? "");
    const value = normalizeCell(match[2] ?? "");
    if (
      !key ||
      key.toLowerCase() === "field" ||
      key.replace(/-/g, "").trim().length === 0
    ) {
      continue;
    }
    fields.set(key, value);
  }
  return fields;
};

const toModuleEntity = (params: {
  readonly id: string;
  readonly title: string;
  readonly responsibility: string;
  readonly productPart: string;
  readonly cluster?: string;
}): ModuleEntity => ({
  id: params.id,
  kind: "service",
  title: params.title,
  responsibility: params.responsibility,
  productPart: params.productPart,
  cluster: params.cluster,
  inputs: [],
  outputs: [],
  contractTargets: [],
  codeTargets: [],
  origin: "agent",
  status: "proposed",
});

const parseModuleRows = (
  body: string,
  productPartId: string,
  clusterId?: string
): readonly ModuleEntity[] =>
  [...body.matchAll(MODULE_ROW_RE)].map((match) =>
    toModuleEntity({
      id: normalizeCell(match[1] ?? ""),
      title: normalizeCell(match[2] ?? ""),
      responsibility: normalizeCell(match[3] ?? ""),
      productPart: productPartId,
      cluster: clusterId,
    })
  );

const parseClusters = (params: {
  readonly content: string;
  readonly section: SectionBlock | undefined;
  readonly productPartId: string;
}): {
  readonly clusters: readonly ClusterEntity[];
  readonly modules: readonly ModuleEntity[];
} => {
  if (!params.section) {
    return { clusters: [], modules: [] };
  }

  const clusterMatches = [...params.section.body.matchAll(CLUSTER_HEADER_RE)];
  const clusters: ClusterEntity[] = [];
  const modules: ModuleEntity[] = [];
  for (const [index, match] of clusterMatches.entries()) {
    const clusterId = normalizeCell(match[1] ?? "");
    if (!clusterId) {
      continue;
    }
    const start = match.index ?? 0;
    const end =
      clusterMatches[index + 1]?.index ?? params.section.body.length;
    const block = params.section.body.slice(start, end);
    const clusterModules = parseModuleRows(block, params.productPartId, clusterId);
    const purpose =
      block.match(PURPOSE_RE)?.[1]?.trim() ??
      `Cluster ${humanizeIdentifier(clusterId)} for ${params.productPartId}.`;
    clusters.push({
      id: clusterId,
      title: humanizeIdentifier(clusterId),
      purpose,
      productPart: params.productPartId,
      moduleIds: clusterModules.map((module) => module.id),
    });
    modules.push(...clusterModules);
  }
  return { clusters, modules };
};

export const materializeModuleMapFromStagedProductPart = (
  content: string
): MaterializedStagedProductPartResult => {
  const title = content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)
    ?.trim();
  if (!(title && INVENTORY_TITLE_RE.test(title))) {
    return buildFailure("invalid-title", 1, "Expected `# Module Inventory` title");
  }

  const sections = collectSections(content);
  const productPartSection = sections.get("Product Part");
  if (!productPartSection) {
    return buildFailure(
      "missing-section",
      1,
      "Expected `## Product Part` section in staged Product Part file"
    );
  }

  const fields = parseFieldTable(productPartSection);
  const productPartId = fields.get("Part ID")?.trim();
  const productPartTitle =
    fields.get("Product Part")?.trim() ??
    content.match(PRODUCT_PART_TITLE_RE)?.[1]?.trim();
  const purpose = fields.get("Purpose")?.trim();
  if (!productPartId) {
    return buildFailure(
      "missing-required-field",
      productPartSection.line,
      "Missing required field: Part ID"
    );
  }
  if (!purpose) {
    return buildFailure(
      "missing-required-field",
      productPartSection.line,
      "Missing required field: Purpose"
    );
  }

  const clusterResult = parseClusters({
    content,
    section: sections.get("Clusters"),
    productPartId,
  });
  const standaloneModules = parseModuleRows(
    sections.get("Standalone Modules")?.body ?? "",
    productPartId
  );
  const productPart: ProductPartEntity = {
    id: productPartId,
    title: productPartTitle ?? humanizeIdentifier(productPartId),
    purpose,
    clusterIds: clusterResult.clusters.map((cluster) => cluster.id),
    standaloneModuleIds: standaloneModules.map((module) => module.id),
  };

  return {
    ok: true,
    value: {
      version: 1,
      stage: "diagram_modules",
      revision: computeDiagramRevision(content),
      updated: new Date().toISOString(),
      productParts: [productPart],
      clusters: clusterResult.clusters,
      modules: [...clusterResult.modules, ...standaloneModules],
      relations: [],
    },
    content,
    warnings: [],
  };
};
