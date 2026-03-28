import { type ParsedCluster, parseCluster } from "./diagram-cluster-parser";
import type {
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
  ModuleMapModel,
  ProductPartEntity,
} from "./diagram-dsl-types";
import {
  type ParsedModule,
  parseModule,
  validateParsedModuleUniqueness,
} from "./diagram-module-parser";
import { parseProductPartsSection } from "./diagram-ownership-parser";
import {
  type ParsedRelation,
  parseRelationsSection,
  validateRelationEndpoints,
} from "./diagram-relations-parser";
import {
  type Block,
  buildParseFailure,
  collectBlocks,
  computeDiagramRevision,
  type Fields,
  parseEntityCollection,
  parseFields,
  toLines,
} from "./markdown-dsl-shared";

const DIAGRAM_MODULES_LEGACY_TITLE_RE = /^# Module Inventory$/;
const INVENTORY_SECTION_RE = /^## (.+)$/;
const CLUSTER_HEADER_RE = /^### Cluster: (.+)$/;
const STANDALONE_MODULE_HEADER_RE = /^### Module: (.+)$/;
const INVENTORY_SECTION_NAMES = new Set([
  "Metadata",
  "Product Parts",
  "Clusters",
  "Standalone Modules",
  "Simple Relations",
  "Assumptions / Open Questions",
]);
const SYNTHETIC_PRODUCT_PART_ID = "default-product-part";
const SYNTHETIC_PRODUCT_PART_TITLE = "Default Product Part";

type ParsedProductPart = ProductPartEntity & {
  readonly sourceLine: number;
};

interface InventoryLine {
  readonly number: number;
  readonly text: string;
}

interface ParsedOwnershipStructure {
  readonly clusters: readonly ParsedCluster[];
  readonly productParts: readonly ParsedProductPart[];
  readonly standaloneModules: readonly ParsedModule[];
}

const required = (
  fields: Fields,
  key: string,
  line: number
): string | MarkdownDslParseError =>
  fields.scalars.get(key)?.trim() || {
    code: "missing-required-field",
    line,
    message: `Missing required field: ${key}`,
  };

const listValue = (fields: Fields, key: string): readonly string[] =>
  fields.lists.get(key) ??
  (fields.scalars.get(key)?.trim()
    ? [fields.scalars.get(key)?.trim() ?? ""]
    : []);

const parseMetadata = (
  lines: readonly { readonly number: number; readonly text: string }[],
  warnings: MarkdownDslParseWarning[]
):
  | { readonly version: number; readonly updated: string }
  | MarkdownDslParseResult => {
  const meta = parseFields(
    { id: "metadata", line: lines[0]?.number ?? 1, lines },
    warnings
  );
  const version = meta.scalars.get("Version")?.trim();
  const stage = meta.scalars.get("Stage")?.trim();
  const updated = meta.scalars.get("Updated")?.trim();
  if (!(version && stage && updated)) {
    return buildParseFailure(
      "missing-required-field",
      lines[0]?.number ?? 1,
      "Metadata must include Version, Stage, and Updated",
      warnings
    );
  }
  const parsedVersion = Number.parseInt(version, 10);
  if (
    !Number.isInteger(parsedVersion) ||
    parsedVersion < 1 ||
    stage !== "diagram_modules"
  ) {
    return buildParseFailure(
      "invalid-metadata",
      lines[0]?.number ?? 1,
      "Metadata Version or Stage is invalid",
      warnings
    );
  }
  return { version: parsedVersion, updated };
};

const collectInventorySections = (
  lines: readonly { readonly number: number; readonly text: string }[],
  warnings: MarkdownDslParseWarning[]
): ReadonlyMap<
  string,
  readonly { readonly number: number; readonly text: string }[]
> => {
  const sections = new Map<
    string,
    readonly { readonly number: number; readonly text: string }[]
  >();
  let current: string | null = null;
  let start = -1;

  for (let index = 0; index < lines.length; index += 1) {
    const name = INVENTORY_SECTION_RE.exec(
      lines[index]?.text.trim() ?? ""
    )?.[1]?.trim();
    if (!name) {
      continue;
    }
    if (current && start >= 0) {
      sections.set(current, lines.slice(start, index));
    }
    if (!INVENTORY_SECTION_NAMES.has(name)) {
      warnings.push({
        code: "unknown-section",
        line: lines[index]?.number ?? index + 1,
        message: `Unknown section: ${name}`,
      });
      current = null;
      start = -1;
      continue;
    }
    current = name;
    start = index + 1;
  }

  if (current && start >= 0) {
    sections.set(current, lines.slice(start));
  }

  return sections;
};

const toFailureResult = (
  error: MarkdownDslParseError,
  warnings: readonly MarkdownDslParseWarning[]
): MarkdownDslParseResult => ({
  ok: false,
  error,
  warnings,
});

const parseProductPart = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ParsedProductPart | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const id = required(fields, "Id", block.line);
  const title = required(fields, "Title", block.line);
  const purpose = required(fields, "Purpose", block.line);
  if (typeof id !== "string") {
    return id;
  }
  if (typeof title !== "string") {
    return title;
  }
  if (typeof purpose !== "string") {
    return purpose;
  }
  if (id !== block.id) {
    return {
      code: "invalid-entity-id",
      line: block.line,
      message: "Product Part header Id must match field Id",
    };
  }
  return {
    id,
    title,
    purpose,
    clusterIds: listValue(fields, "Clusters"),
    standaloneModuleIds: listValue(fields, "Standalone Modules"),
    notes: fields.notes,
    sourceLine: block.line,
  };
};

const validateProductPartMembership = (
  productPart: ParsedProductPart,
  clusters: readonly ParsedCluster[],
  standaloneModules: readonly ParsedModule[]
): MarkdownDslParseError | null => {
  const clusterIds = clusters.map((cluster) => cluster.id);
  if (
    clusterIds.length !== productPart.clusterIds.length ||
    clusterIds.some((id, index) => id !== productPart.clusterIds[index])
  ) {
    return {
      code: "invalid-metadata",
      line: productPart.sourceLine,
      message: `Product Part ${productPart.id} Clusters list must match nested cluster blocks`,
    };
  }
  const standaloneIds = standaloneModules.map((module) => module.id);
  if (
    standaloneIds.length !== productPart.standaloneModuleIds.length ||
    standaloneIds.some(
      (id, index) => id !== productPart.standaloneModuleIds[index]
    )
  ) {
    return {
      code: "invalid-metadata",
      line: productPart.sourceLine,
      message: `Product Part ${productPart.id} Standalone Modules list must match nested standalone modules`,
    };
  }
  if (clusterIds.length === 0 && standaloneIds.length === 0) {
    return {
      code: "missing-required-field",
      line: productPart.sourceLine,
      message: `Product Part ${productPart.id} must contain clusters or standalone modules`,
    };
  }
  return null;
};

const validateInventorySections = (
  titleLine: number,
  warnings: readonly MarkdownDslParseWarning[],
  sections: ReadonlyMap<string, readonly InventoryLine[]>
):
  | {
      readonly clusters?: readonly InventoryLine[];
      readonly metadata: readonly InventoryLine[];
      readonly productParts?: readonly InventoryLine[];
      readonly relations: readonly InventoryLine[];
      readonly standalone?: readonly InventoryLine[];
    }
  | MarkdownDslParseResult => {
  const metadata = sections.get("Metadata");
  const productParts = sections.get("Product Parts");
  const clusters = sections.get("Clusters");
  const standalone = sections.get("Standalone Modules");
  const relations = sections.get("Simple Relations");
  const hasLegacySections = Boolean(clusters && standalone);
  const hasProductPartsSection = Boolean(productParts);
  if (
    !(metadata && relations && (hasLegacySections || hasProductPartsSection))
  ) {
    return buildParseFailure(
      "missing-section",
      titleLine,
      "Metadata, Simple Relations, and either Product Parts or legacy Clusters / Standalone Modules sections are required",
      warnings
    );
  }
  return {
    clusters,
    metadata,
    productParts,
    relations,
    standalone,
  };
};

const materializeSyntheticLegacyOwnership = (
  titleLine: number,
  clusters: readonly ParsedCluster[],
  standaloneModules: readonly ParsedModule[]
): ParsedOwnershipStructure => ({
  clusters: clusters.map((cluster) => ({
    ...cluster,
    productPart: SYNTHETIC_PRODUCT_PART_ID,
    modules: cluster.modules.map((module) => ({
      ...module,
      productPart: SYNTHETIC_PRODUCT_PART_ID,
    })),
  })),
  productParts: [
    {
      id: SYNTHETIC_PRODUCT_PART_ID,
      title: SYNTHETIC_PRODUCT_PART_TITLE,
      purpose:
        "Synthetic top-level ownership container materialized from a legacy flat inventory",
      clusterIds: clusters.map((cluster) => cluster.id),
      standaloneModuleIds: standaloneModules.map((module) => module.id),
      notes:
        "Materialized automatically because the legacy inventory does not declare Product Parts explicitly.",
      sourceLine: titleLine,
    },
  ],
  standaloneModules: standaloneModules.map((module) => ({
    ...module,
    productPart: SYNTHETIC_PRODUCT_PART_ID,
  })),
});

const parseLegacyOwnershipSections = (
  titleLine: number,
  clusters: readonly InventoryLine[],
  standalone: readonly InventoryLine[],
  warnings: MarkdownDslParseWarning[]
): ParsedOwnershipStructure | MarkdownDslParseResult => {
  const parsedClusters = parseEntityCollection(
    collectBlocks(clusters, CLUSTER_HEADER_RE, warnings),
    warnings,
    parseCluster,
    "cluster"
  );
  if (!Array.isArray(parsedClusters)) {
    return parsedClusters as MarkdownDslParseResult;
  }
  const parsedStandalone = parseEntityCollection(
    collectBlocks(standalone, STANDALONE_MODULE_HEADER_RE, warnings),
    warnings,
    (block, moduleWarnings) =>
      parseModule(block, moduleWarnings, { expectedCluster: null }),
    "module"
  );
  if (!Array.isArray(parsedStandalone)) {
    return parsedStandalone as MarkdownDslParseResult;
  }
  return materializeSyntheticLegacyOwnership(
    titleLine,
    parsedClusters as readonly ParsedCluster[],
    parsedStandalone as readonly ParsedModule[]
  );
};

const parseOwnershipSections = (
  titleLine: number,
  sections: {
    readonly clusters?: readonly InventoryLine[];
    readonly productParts?: readonly InventoryLine[];
    readonly standalone?: readonly InventoryLine[];
  },
  warnings: MarkdownDslParseWarning[]
): ParsedOwnershipStructure | MarkdownDslParseResult => {
  if (sections.productParts) {
    return parseProductPartsSection({
      lines: sections.productParts,
      warnings,
      parseProductPart,
      validateProductPartMembership,
    });
  }
  if (sections.clusters && sections.standalone) {
    return parseLegacyOwnershipSections(
      titleLine,
      sections.clusters,
      sections.standalone,
      warnings
    );
  }
  return buildParseFailure(
    "missing-section",
    titleLine,
    "Ownership sections are incomplete",
    warnings
  );
};

const stripParsedSourceLine = <T extends { readonly sourceLine: number }>(
  record: T
): Omit<T, "sourceLine"> => {
  const { sourceLine: _sourceLine, ...next } = record;
  return next;
};

const buildModuleMapValue = (
  content: string,
  metadata: { readonly updated: string; readonly version: number },
  ownership: ParsedOwnershipStructure,
  relations: readonly ParsedRelation[]
): ModuleMapModel => {
  const allModules = [
    ...ownership.clusters.flatMap((cluster) => cluster.modules),
    ...ownership.standaloneModules,
  ].map(stripParsedSourceLine);
  return {
    version: metadata.version,
    stage: "diagram_modules",
    revision: computeDiagramRevision(content),
    updated: metadata.updated,
    productParts: ownership.productParts.map(stripParsedSourceLine),
    clusters: ownership.clusters.map(({ modules: _modules, ...cluster }) =>
      stripParsedSourceLine(cluster)
    ),
    modules: allModules,
    relations: relations.map(stripParsedSourceLine),
  };
};

export const parseDiagramModulesDsl = (
  content: string
): MarkdownDslParseResult => {
  if (!content.trim()) {
    return buildParseFailure("empty-file", 1, "Markdown DSL file is empty");
  }

  const lines = toLines(content);
  const title = lines.find((line) => line.text.trim().length > 0);
  if (!(title && DIAGRAM_MODULES_LEGACY_TITLE_RE.test(title.text.trim()))) {
    return buildParseFailure(
      "invalid-title",
      title?.number ?? 1,
      "Expected `# Module Inventory` title"
    );
  }

  const warnings: MarkdownDslParseWarning[] = [];
  const sections = collectInventorySections(
    lines.slice(title.number),
    warnings
  );
  const validatedSections = validateInventorySections(
    title.number,
    warnings,
    sections
  );
  if ("ok" in validatedSections) {
    return validatedSections;
  }
  const parsedMetadata = parseMetadata(validatedSections.metadata, warnings);
  if ("ok" in parsedMetadata) {
    return parsedMetadata;
  }
  const ownership = parseOwnershipSections(
    title.number,
    validatedSections,
    warnings
  );
  if ("ok" in ownership) {
    return ownership;
  }
  const relationResult = parseRelationsSection(
    validatedSections.relations,
    warnings
  );
  if ("ok" in relationResult) {
    return relationResult;
  }
  const relationRecords = relationResult;

  const uniqueModulesError = validateParsedModuleUniqueness(
    ownership.clusters,
    ownership.standaloneModules
  );
  if (uniqueModulesError) {
    return toFailureResult(uniqueModulesError, warnings);
  }
  const allModules = [
    ...ownership.clusters.flatMap((cluster) => cluster.modules),
    ...ownership.standaloneModules,
  ].map(stripParsedSourceLine);
  const relationEndpointError = validateRelationEndpoints(
    allModules,
    relationRecords
  );
  if (relationEndpointError) {
    return toFailureResult(relationEndpointError, warnings);
  }
  return {
    ok: true,
    value: buildModuleMapValue(
      content,
      parsedMetadata,
      ownership,
      relationRecords
    ),
    warnings,
  };
};

export type MaterializedModuleMapResult =
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

export const materializeModuleMapFromInventoryDsl = (
  content: string
): MaterializedModuleMapResult => {
  const inventoryResult = parseDiagramModulesDsl(content);
  if (!inventoryResult.ok) {
    return {
      ok: false,
      error: inventoryResult.error,
      warnings: inventoryResult.warnings,
    };
  }

  return {
    ok: true,
    value: inventoryResult.value as ModuleMapModel,
    content,
    warnings: inventoryResult.warnings,
  };
};
