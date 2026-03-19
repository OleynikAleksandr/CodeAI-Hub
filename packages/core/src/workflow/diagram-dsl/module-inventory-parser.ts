import {
  ENTITY_ORIGINS,
  ENTITY_STATUSES,
  type EntityOrigin,
  type EntityStatus,
  type MarkdownDslParseError,
  type MarkdownDslParseResult,
  type MarkdownDslParseWarning,
  MODULE_KINDS,
  type ModuleEntity,
  type ModuleKind,
  type ModuleMapModel,
  type ModuleRelation,
  RELATION_TYPES,
  type RelationType,
} from "./diagram-dsl-types";
import { parseModuleMapDsl } from "./markdown-dsl-parser";
import { serializeModuleMapDsl } from "./markdown-dsl-serializer";
import {
  type Block,
  buildParseFailure,
  collectBlocks,
  computeDiagramRevision,
  type Fields,
  isOneOf,
  parseEntityCollection,
  parseFields,
  toLines,
} from "./markdown-dsl-shared";

const INVENTORY_TITLE_RE = /^# Module Inventory$/;
const INVENTORY_SECTION_RE = /^## (.+)$/;
const CLUSTER_HEADER_RE = /^### Cluster: (.+)$/;
const MODULE_HEADER_RE = /^### Module: (.+)$/;
const CLUSTER_MODULE_HEADER_RE = /^#### Module: (.+)$/;
const RELATION_HEADER_RE = /^### Relation: (.+)$/;
const INVENTORY_SECTION_NAMES = new Set([
  "Metadata",
  "Clusters",
  "Standalone Modules",
  "Simple Relations",
  "Assumptions / Open Questions",
]);

type BaseEntity = {
  readonly id: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
};

type ParsedModule = ModuleEntity & {
  readonly sourceLine: number;
};

type ParsedRelation = ModuleRelation & {
  readonly sourceLine: number;
};

type ParsedCluster = {
  readonly id: string;
  readonly sourceLine: number;
  readonly modules: readonly ParsedModule[];
};

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

const toParseError = (
  result: MarkdownDslParseResult
): MarkdownDslParseError => {
  if (!result.ok) {
    return result.error;
  }
  throw new Error("Unexpected inventory parser success object");
};

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

const parseBaseEntity = (
  fields: Fields,
  block: Block,
  entityLabel: string
): BaseEntity | MarkdownDslParseError => {
  const id = required(fields, "Id", block.line);
  const origin = required(fields, "Origin", block.line);
  const status = required(fields, "Status", block.line);
  if (typeof id !== "string") {
    return id;
  }
  if (typeof origin !== "string") {
    return origin;
  }
  if (typeof status !== "string") {
    return status;
  }
  if (id !== block.id) {
    return {
      code: "invalid-entity-id",
      line: block.line,
      message: `${entityLabel} header Id must match field Id`,
    };
  }
  if (!(isOneOf(origin, ENTITY_ORIGINS) && isOneOf(status, ENTITY_STATUSES))) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Invalid ${entityLabel.toLowerCase()} enum value for ${id}`,
    };
  }
  return { id, origin, status };
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

const parseModule = (
  block: Block,
  warnings: MarkdownDslParseWarning[],
  expectedCluster?: string | null
): ParsedModule | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Module");
  const kind = required(fields, "Kind", block.line);
  const title = required(fields, "Title", block.line);
  const responsibility = required(fields, "Responsibility", block.line);
  const cluster = fields.scalars.get("Cluster")?.trim() || undefined;
  if ("code" in base) {
    return base;
  }
  if (typeof kind !== "string") {
    return kind;
  }
  if (typeof title !== "string") {
    return title;
  }
  if (typeof responsibility !== "string") {
    return responsibility;
  }
  if (!isOneOf(kind, MODULE_KINDS)) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Invalid module enum value for ${base.id}`,
    };
  }
  if (expectedCluster) {
    if (cluster !== expectedCluster) {
      return {
        code: "invalid-metadata",
        line: block.line,
        message: `Cluster module ${base.id} must declare Cluster: ${expectedCluster}`,
      };
    }
  } else if (cluster) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Standalone module ${base.id} must not declare Cluster`,
    };
  }
  return {
    ...base,
    kind: kind as ModuleKind,
    title,
    responsibility,
    cluster: expectedCluster ?? undefined,
    inputs: listValue(fields, "Inputs"),
    outputs: listValue(fields, "Outputs"),
    specTarget: fields.scalars.get("Spec Target")?.trim() || undefined,
    contractTargets: listValue(fields, "Contract Targets"),
    codeTargets: listValue(fields, "Code Targets"),
    origin: base.origin,
    status: base.status,
    notes: fields.notes,
    rationale: fields.rationale,
    sourceLine: block.line,
  };
};

const parseRelation = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ParsedRelation | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Relation");
  const from = required(fields, "From", block.line);
  const to = required(fields, "To", block.line);
  const type = required(fields, "Type", block.line);
  const criticality = fields.scalars.get("Criticality")?.trim();
  if ("code" in base) {
    return base;
  }
  if (typeof from !== "string") {
    return from;
  }
  if (typeof to !== "string") {
    return to;
  }
  if (typeof type !== "string") {
    return type;
  }
  if (
    !isOneOf(type, RELATION_TYPES) ||
    (criticality && !isOneOf(criticality, ["high", "medium", "low"] as const))
  ) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Invalid relation enum value for ${base.id}`,
    };
  }
  return {
    ...base,
    from,
    to,
    type: type as RelationType,
    label: fields.scalars.get("Label")?.trim() || undefined,
    criticality: criticality as ParsedRelation["criticality"],
    notes: fields.notes,
    sourceLine: block.line,
  };
};

const parseCluster = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ParsedCluster | MarkdownDslParseError => {
  const nestedHeaderIndex = block.lines.findIndex((line) =>
    CLUSTER_MODULE_HEADER_RE.test(line.text.trim())
  );
  const clusterLines =
    nestedHeaderIndex >= 0
      ? block.lines.slice(0, nestedHeaderIndex)
      : block.lines;
  const nestedLines =
    nestedHeaderIndex >= 0 ? block.lines.slice(nestedHeaderIndex) : [];
  const fields = parseFields(
    { id: block.id, line: block.line, lines: clusterLines },
    warnings
  );
  const id = required(fields, "Id", block.line);
  const purpose = required(fields, "Purpose", block.line);
  const moduleIds = listValue(fields, "Modules");
  if (typeof id !== "string") {
    return id;
  }
  if (typeof purpose !== "string") {
    return purpose;
  }
  if (id !== block.id) {
    return {
      code: "invalid-entity-id",
      line: block.line,
      message: "Cluster header Id must match field Id",
    };
  }
  if (moduleIds.length === 0) {
    return {
      code: "missing-required-field",
      line: block.line,
      message: "Missing required field: Modules",
    };
  }
  if (nestedLines.length === 0) {
    return {
      code: "missing-required-field",
      line: block.line,
      message: `Cluster ${id} must contain module blocks`,
    };
  }

  const parsedModules = parseEntityCollection(
    collectBlocks(nestedLines, CLUSTER_MODULE_HEADER_RE, warnings),
    warnings,
    (moduleBlock, moduleWarnings) =>
      parseModule(moduleBlock, moduleWarnings, id),
    "module"
  );
  if (!Array.isArray(parsedModules)) {
    return toParseError(parsedModules as MarkdownDslParseResult);
  }

  const nestedModuleIds = parsedModules.map((module) => module.id);
  if (
    nestedModuleIds.length !== moduleIds.length ||
    nestedModuleIds.some((moduleId, index) => moduleId !== moduleIds[index])
  ) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Cluster ${id} Modules list must match nested module blocks`,
    };
  }

  purpose.trim();
  return {
    id,
    sourceLine: block.line,
    modules: parsedModules,
  };
};

const validateModuleUniqueness = (
  clusters: readonly ParsedCluster[],
  standaloneModules: readonly ParsedModule[]
): MarkdownDslParseError | null => {
  const seen = new Map<string, number>();
  for (const module of [
    ...clusters.flatMap((cluster) => cluster.modules),
    ...standaloneModules,
  ]) {
    const existingLine = seen.get(module.id);
    if (typeof existingLine === "number") {
      return {
        code: "duplicate-entity-id",
        line: module.sourceLine,
        message: `Duplicate module id: ${module.id}`,
      };
    }
    seen.set(module.id, module.sourceLine);
  }
  return null;
};

const validateRelationEndpoints = (
  modules: readonly { readonly id: string }[],
  relations: readonly ParsedRelation[]
): MarkdownDslParseError | null => {
  const moduleIds = new Set(modules.map((module) => module.id));
  for (const relation of relations) {
    if (!moduleIds.has(relation.from)) {
      return {
        code: "invalid-metadata",
        line: relation.sourceLine,
        message: `Relation ${relation.id} references unknown module ${relation.from}`,
      };
    }
    if (!moduleIds.has(relation.to)) {
      return {
        code: "invalid-metadata",
        line: relation.sourceLine,
        message: `Relation ${relation.id} references unknown module ${relation.to}`,
      };
    }
  }
  return null;
};

export const parseModuleInventoryDsl = (
  content: string
): MarkdownDslParseResult => {
  if (!content.trim()) {
    return buildParseFailure("empty-file", 1, "Markdown DSL file is empty");
  }

  const lines = toLines(content);
  const title = lines.find((line) => line.text.trim().length > 0);
  if (!(title && INVENTORY_TITLE_RE.test(title.text.trim()))) {
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
  const metadata = sections.get("Metadata");
  const clusters = sections.get("Clusters");
  const standalone = sections.get("Standalone Modules");
  const relations = sections.get("Simple Relations");
  if (!(metadata && clusters && standalone && relations)) {
    return buildParseFailure(
      "missing-section",
      title.number,
      "Metadata, Clusters, Standalone Modules, and Simple Relations sections are required",
      warnings
    );
  }

  const parsedMetadata = parseMetadata(metadata, warnings);
  if ("ok" in parsedMetadata) {
    return parsedMetadata;
  }

  const parsedClusters = parseEntityCollection(
    collectBlocks(clusters, CLUSTER_HEADER_RE, warnings),
    warnings,
    parseCluster,
    "cluster"
  );
  if (!Array.isArray(parsedClusters)) {
    return parsedClusters as MarkdownDslParseResult;
  }
  const clusterRecords = parsedClusters as readonly ParsedCluster[];

  const parsedStandalone = parseEntityCollection(
    collectBlocks(standalone, MODULE_HEADER_RE, warnings),
    warnings,
    (block, moduleWarnings) => parseModule(block, moduleWarnings, null),
    "module"
  );
  if (!Array.isArray(parsedStandalone)) {
    return parsedStandalone as MarkdownDslParseResult;
  }
  const standaloneRecords = parsedStandalone as readonly ParsedModule[];

  const parsedRelations = parseEntityCollection(
    collectBlocks(relations, RELATION_HEADER_RE, warnings),
    warnings,
    parseRelation,
    "relation"
  );
  if (!Array.isArray(parsedRelations)) {
    return parsedRelations as MarkdownDslParseResult;
  }
  const relationRecords = parsedRelations as readonly ParsedRelation[];

  const uniqueModulesError = validateModuleUniqueness(
    clusterRecords,
    standaloneRecords
  );
  if (uniqueModulesError) {
    return { ok: false, error: uniqueModulesError, warnings };
  }

  const allModules = [
    ...clusterRecords.flatMap((cluster) => cluster.modules),
    ...standaloneRecords,
  ].map(({ sourceLine: _sourceLine, ...module }) => module);
  const relationEndpointError = validateRelationEndpoints(
    allModules,
    relationRecords
  );
  if (relationEndpointError) {
    return { ok: false, error: relationEndpointError, warnings };
  }

  const value: ModuleMapModel = {
    version: parsedMetadata.version,
    stage: "diagram_modules",
    revision: computeDiagramRevision(content),
    updated: parsedMetadata.updated,
    modules: allModules,
    relations: relationRecords.map(
      ({ sourceLine: _sourceLine, ...relation }) => relation
    ),
  };

  return { ok: true, value, warnings };
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
  const inventoryResult = parseModuleInventoryDsl(content);
  if (!inventoryResult.ok) {
    return {
      ok: false,
      error: inventoryResult.error,
      warnings: inventoryResult.warnings,
    };
  }

  const serialized = serializeModuleMapDsl(
    inventoryResult.value as ModuleMapModel
  );
  const parsedModuleMap = parseModuleMapDsl(serialized);
  if (!parsedModuleMap.ok) {
    return {
      ok: false,
      error: parsedModuleMap.error,
      warnings: parsedModuleMap.warnings,
    };
  }

  return {
    ok: true,
    value: parsedModuleMap.value as ModuleMapModel,
    content: serialized,
    warnings: parsedModuleMap.warnings,
  };
};
