import {
  CRITICALITY_LEVELS,
  type Criticality,
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
import {
  type Block,
  buildParseFailure,
  collectBlocks,
  collectSections,
  computeDiagramRevision,
  type Fields,
  isOneOf,
  parseEntityCollection,
  parseFields,
  toLines,
} from "./markdown-dsl-shared";

const MODULE_TITLE_RE = /^# Module Map$/;
const MODULE_HEADER_RE = /^### Module: (.+)$/;
const RELATION_HEADER_RE = /^### Relation: (.+)$/;

interface BaseEntity {
  readonly id: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
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

const parseModule = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ModuleEntity | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Module");
  const kind = required(fields, "Kind", block.line);
  const title = required(fields, "Title", block.line);
  const responsibility = required(fields, "Responsibility", block.line);
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
  return {
    ...base,
    kind: kind as ModuleKind,
    title,
    responsibility,
    cluster: fields.scalars.get("Cluster")?.trim() || undefined,
    inputs: listValue(fields, "Inputs"),
    outputs: listValue(fields, "Outputs"),
    specTarget: fields.scalars.get("Spec Target")?.trim() || undefined,
    contractTargets: listValue(fields, "Contract Targets"),
    codeTargets: listValue(fields, "Code Targets"),
    notes: fields.notes,
    rationale: fields.rationale,
  };
};

const parseRelation = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ModuleRelation | MarkdownDslParseError => {
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
    (criticality && !isOneOf(criticality, CRITICALITY_LEVELS))
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
    criticality: criticality as Criticality | undefined,
    notes: fields.notes,
  };
};

export const parseModuleMapDsl = (content: string): MarkdownDslParseResult => {
  if (!content.trim()) {
    return buildParseFailure("empty-file", 1, "Markdown DSL file is empty");
  }
  const lines = toLines(content);
  const title = lines.find((line) => line.text.trim().length > 0);
  if (!(title && MODULE_TITLE_RE.test(title.text.trim()))) {
    return buildParseFailure(
      "invalid-title",
      title?.number ?? 1,
      "Expected `# Module Map` title"
    );
  }
  const warnings: MarkdownDslParseWarning[] = [];
  const sections = collectSections(lines.slice(title.number), warnings);
  const metadata = sections.get("Metadata");
  const modules = sections.get("Modules");
  const relations = sections.get("Relations");
  if (!(metadata && modules && relations)) {
    return buildParseFailure(
      "missing-section",
      title.number,
      "Metadata, Modules, and Relations sections are required",
      warnings
    );
  }
  const parsedMetadata = parseMetadata(metadata, warnings);
  if ("ok" in parsedMetadata) {
    return parsedMetadata;
  }
  const parsedModules = parseEntityCollection(
    collectBlocks(modules, MODULE_HEADER_RE, warnings),
    warnings,
    parseModule,
    "module"
  );
  if ("ok" in parsedModules) {
    return parsedModules;
  }
  const parsedRelations = parseEntityCollection(
    collectBlocks(relations, RELATION_HEADER_RE, warnings),
    warnings,
    parseRelation,
    "relation"
  );
  if ("ok" in parsedRelations) {
    return parsedRelations;
  }
  const value: ModuleMapModel = {
    version: parsedMetadata.version,
    stage: "diagram_modules",
    revision: computeDiagramRevision(content),
    updated: parsedMetadata.updated,
    modules: parsedModules,
    relations: parsedRelations,
  };
  return { ok: true, value, warnings };
};
