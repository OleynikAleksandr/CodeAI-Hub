import type {
  ClusterEntity,
  MarkdownDslParseError,
  MarkdownDslParseWarning,
  ModuleEntity,
  ModuleMapModel,
  ProductPartEntity,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { computeDiagramRevision } from "../../../../../packages/core/src/workflow/diagram-dsl/markdown-dsl-parser";

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

export type SectionBlock = {
  readonly body: string;
  readonly line: number;
};

export const buildFailure = (
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

export const normalizeCell = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.startsWith("`") && trimmed.endsWith("`")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

export const normalizeParagraph = (value: string): string =>
  value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

export const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export const collectSections = (
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

export const parseFieldTable = (
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

export const parseModuleRows = (
  body: string,
  productPartId: string,
  rowPattern: RegExp,
  clusterId?: string
): readonly ModuleEntity[] =>
  [...body.matchAll(rowPattern)].map((match) =>
    toModuleEntity({
      id: normalizeCell(match[1] ?? ""),
      title: normalizeCell(match[2] ?? ""),
      responsibility: normalizeParagraph(match[3] ?? ""),
      productPart: productPartId,
      cluster: clusterId,
    })
  );

export const parseClusters = (params: {
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

  const clusterMatches = [...params.section.body.matchAll(params.headerPattern)];
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

export const buildModuleMap = (params: {
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
