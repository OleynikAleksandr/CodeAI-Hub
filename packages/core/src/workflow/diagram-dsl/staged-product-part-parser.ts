import type {
  ClusterEntity,
  MarkdownDslParseError,
  MarkdownDslParseWarning,
  ModuleEntity,
  ModuleMapModel,
  ProductPartEntity,
} from "./diagram-dsl-types";
import { computeDiagramRevision } from "./markdown-dsl-shared";

export type MaterializedStagedProductPartResult =
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

interface SectionBlock {
  readonly body: string;
  readonly line: number;
}

const DIAGRAM_MODULES_LEGACY_TITLE_RE = /^# Module Inventory$/m;
const OUTLINE_TITLE_RE = /^# Product Part:\s+(.+)\s*$/m;
const OUTLINE_PART_ID_RE = /^- `part_id`:\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/m;
const PRODUCT_PART_TITLE_RE = /^Product Part:\s*`([^`]+)`\s*$/m;
const SECTION_RE = /^## (.+)$/gm;
const TABLE_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/gm;
const CLUSTER_HEADER_RE =
  /^### Cluster(?: \d+\.)?\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const OUTLINE_CLUSTER_HEADER_RE =
  /^###(?:\s+\d+\.|\s+Cluster:)?\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const PURPOSE_RE = /^\*\*Purpose:\*\*\s+(.+)$/m;
const MODULE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*(.+?)\s*\|$/gm;
const OUTLINE_MODULE_ROW_RE =
  /^\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*(.+?)[ \t]*\|$/gm;
const LINE_SPLIT_RE = /\r?\n/u;

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
  content.slice(0, Math.max(0, index)).split(LINE_SPLIT_RE).length;

const normalizeCell = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

const normalizeParagraph = (value: string): string =>
  value
    .split(LINE_SPLIT_RE)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const collectSections = (
  content: string,
  sectionPattern: RegExp
): ReadonlyMap<string, SectionBlock> => {
  const sections = new Map<string, SectionBlock>();
  const matches = [...content.matchAll(sectionPattern)];
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

const parseFieldTable = (
  section: SectionBlock,
  rowPattern: RegExp
): ReadonlyMap<string, string> => {
  const fields = new Map<string, string>();
  for (const match of section.body.matchAll(rowPattern)) {
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
  rowPattern: RegExp,
  clusterId?: string
): readonly ModuleEntity[] =>
  [...body.matchAll(rowPattern)]
    .filter((match) => normalizeCell(match[1] ?? "") !== "module-id")
    .map((match) => {
      const id = normalizeCell(match[1] ?? "");
      return toModuleEntity({
        id,
        title: humanizeIdentifier(id),
        responsibility: normalizeParagraph(match[2] ?? ""),
        productPart: productPartId,
        cluster: clusterId,
      });
    });

const parseClusters = (params: {
  readonly section: SectionBlock | undefined;
  readonly productPartId: string;
  readonly headerPattern: RegExp;
  readonly rowPattern: RegExp;
  readonly purposePattern: RegExp;
}): {
  readonly clusters: readonly ClusterEntity[];
  readonly modules: readonly ModuleEntity[];
} => {
  if (!params.section) {
    return { clusters: [], modules: [] };
  }

  const clusterMatches = [
    ...params.section.body.matchAll(params.headerPattern),
  ];
  const clusters: ClusterEntity[] = [];
  const modules: ModuleEntity[] = [];
  for (const [index, match] of clusterMatches.entries()) {
    const clusterId = normalizeCell(match[1] ?? "");
    if (!clusterId) {
      continue;
    }
    const start = match.index ?? 0;
    const end = clusterMatches[index + 1]?.index ?? params.section.body.length;
    const block = params.section.body.slice(start, end);
    const clusterModules = parseModuleRows(
      block,
      params.productPartId,
      params.rowPattern,
      clusterId
    );
    const purpose =
      normalizeParagraph(block.match(params.purposePattern)?.[1] ?? "") ||
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

const buildModuleMap = (params: {
  readonly content: string;
  readonly productPartId: string;
  readonly productPartTitle: string;
  readonly purpose: string;
  readonly clusters: readonly ClusterEntity[];
  readonly clusterModules: readonly ModuleEntity[];
  readonly standaloneModules: readonly ModuleEntity[];
}): MaterializedStagedProductPartResult => {
  const productPart: ProductPartEntity = {
    id: params.productPartId,
    title: params.productPartTitle,
    purpose: params.purpose,
    clusterIds: params.clusters.map((cluster) => cluster.id),
    standaloneModuleIds: params.standaloneModules.map((module) => module.id),
  };

  return {
    ok: true,
    value: {
      version: 1,
      stage: "diagram_modules",
      revision: computeDiagramRevision(params.content),
      updated: new Date().toISOString(),
      productParts: [productPart],
      clusters: params.clusters,
      modules: [...params.clusterModules, ...params.standaloneModules],
      relations: [],
    },
    content: params.content,
    warnings: [],
  };
};

const materializeModuleMapFromProductPartOutline = (
  content: string,
  title: string
): MaterializedStagedProductPartResult => {
  const productPartTitle = title.match(OUTLINE_TITLE_RE)?.[1]?.trim();
  if (!productPartTitle) {
    return buildFailure(
      "invalid-title",
      1,
      "Expected `# Product Part: <title>` title"
    );
  }

  const sections = collectSections(content, SECTION_RE);
  const identitySection = sections.get("Identity");
  const identityFields = identitySection
    ? parseFieldTable(identitySection, TABLE_ROW_RE)
    : new Map<string, string>();
  const purposeSection = sections.get("Purpose");
  const purpose =
    normalizeParagraph(purposeSection?.body ?? "") ||
    identityFields.get("Purpose")?.trim() ||
    "";
  const productPartId =
    content.match(OUTLINE_PART_ID_RE)?.[1]?.trim() ??
    identityFields.get("Part ID")?.trim() ??
    identityFields.get("Id")?.trim();
  if (!productPartId) {
    return buildFailure(
      "missing-required-field",
      1,
      "Missing required field: part_id"
    );
  }
  if (!purpose) {
    return buildFailure(
      "missing-required-field",
      purposeSection?.line ?? 1,
      "Missing required section content: Purpose"
    );
  }

  const clusterResult = parseClusters({
    section:
      sections.get("Owned Clusters") ??
      sections.get("Cluster Inventory") ??
      sections.get("Cluster Ownership"),
    productPartId,
    headerPattern: OUTLINE_CLUSTER_HEADER_RE,
    rowPattern: OUTLINE_MODULE_ROW_RE,
    purposePattern: PURPOSE_RE,
  });

  return buildModuleMap({
    content,
    productPartId,
    productPartTitle:
      identityFields.get("Product Part")?.trim() ??
      identityFields.get("Name")?.trim() ??
      normalizeCell(productPartTitle),
    purpose,
    clusters: clusterResult.clusters,
    clusterModules: clusterResult.modules,
    standaloneModules: parseModuleRows(
      (
        sections.get("Direct Standalone Modules Under This Part") ??
        sections.get("Standalone Modules") ??
        sections.get("Owned Standalone Modules")
      )?.body ?? "",
      productPartId,
      OUTLINE_MODULE_ROW_RE
    ),
  });
};

const materializeModuleMapFromInventoryProductPart = (
  content: string,
  title: string
): MaterializedStagedProductPartResult => {
  if (!DIAGRAM_MODULES_LEGACY_TITLE_RE.test(title)) {
    return buildFailure(
      "invalid-title",
      1,
      "Expected `# Module Inventory` title"
    );
  }

  const sections = collectSections(content, SECTION_RE);
  const productPartSection = sections.get("Product Part");
  if (!productPartSection) {
    return buildFailure(
      "missing-section",
      1,
      "Expected `## Product Part` section in staged Product Part file"
    );
  }

  const fields = parseFieldTable(productPartSection, TABLE_ROW_RE);
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
    section: sections.get("Clusters"),
    productPartId,
    headerPattern: CLUSTER_HEADER_RE,
    rowPattern: MODULE_ROW_RE,
    purposePattern: PURPOSE_RE,
  });

  return buildModuleMap({
    content,
    productPartId,
    productPartTitle: productPartTitle ?? humanizeIdentifier(productPartId),
    purpose,
    clusters: clusterResult.clusters,
    clusterModules: clusterResult.modules,
    standaloneModules: parseModuleRows(
      sections.get("Standalone Modules")?.body ?? "",
      productPartId,
      MODULE_ROW_RE
    ),
  });
};

export const materializeModuleMapFromStagedProductPart = (
  content: string
): MaterializedStagedProductPartResult => {
  const title = content
    .split(LINE_SPLIT_RE)
    .find((line) => line.trim().length > 0)
    ?.trim();
  if (!title) {
    return buildFailure(
      "invalid-title",
      1,
      "Expected staged Product Part title"
    );
  }
  if (OUTLINE_TITLE_RE.test(title)) {
    return materializeModuleMapFromProductPartOutline(content, title);
  }
  return materializeModuleMapFromInventoryProductPart(content, title);
};
