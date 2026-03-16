import {
  ENTITY_ORIGINS,
  ENTITY_STATUSES,
  FACADE_PORT_DIRECTIONS,
  FACADE_VISIBILITIES,
  type FacadeEntity,
  type FacadeMapModel,
  type FacadePort,
  type FacadePortDirection,
  type FacadeRelation,
  type FacadeVisibility,
  type MarkdownDslParseError,
  type MarkdownDslParseResult,
  type MarkdownDslParseWarning,
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

const FACADE_TITLE_RE = /^# Facade Map$/;
const FACADE_HEADER_RE = /^### Facade: (.+)$/;
const FACADE_RELATION_HEADER_RE = /^### Facade Relation: (.+)$/;
const FACADE_PORT_RE = /^(In|Out):\s+(.+?)\s+(?:from|to)\s+(.+)$/;

type BaseEntity = {
  readonly id: string;
  readonly origin: (typeof ENTITY_ORIGINS)[number];
  readonly status: (typeof ENTITY_STATUSES)[number];
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
    stage !== "diagram_facades"
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

const parseFacadePorts = (
  items: readonly string[],
  line: number
): readonly FacadePort[] | MarkdownDslParseError => {
  const ports: FacadePort[] = [];
  for (const item of items) {
    const match = FACADE_PORT_RE.exec(item);
    const direction = match?.[1]?.trim();
    const type = match?.[2]?.trim();
    const target = match?.[3]?.trim();
    if (
      !(
        direction &&
        type &&
        target &&
        isOneOf(direction, FACADE_PORT_DIRECTIONS)
      )
    ) {
      return {
        code: "invalid-metadata",
        line,
        message: `Invalid facade port declaration: ${item}`,
      };
    }
    ports.push({ direction: direction as FacadePortDirection, type, target });
  }
  return ports;
};

const parseFacade = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): FacadeEntity | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Facade");
  const module = required(fields, "Module", block.line);
  const kind = required(fields, "Kind", block.line);
  const visibility = required(fields, "Visibility", block.line);
  if ("code" in base) {
    return base;
  }
  if (typeof module !== "string") {
    return module;
  }
  if (typeof kind !== "string") {
    return kind;
  }
  if (typeof visibility !== "string") {
    return visibility;
  }
  if (kind !== "class" || !isOneOf(visibility, FACADE_VISIBILITIES)) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Invalid facade enum value for ${base.id}`,
    };
  }
  const ports = parseFacadePorts(listValue(fields, "Ports"), block.line);
  if ("code" in ports) {
    return ports;
  }
  return {
    ...base,
    module,
    kind: "class",
    visibility: visibility as FacadeVisibility,
    methods: listValue(fields, "Methods"),
    ports,
    contractTargets: listValue(fields, "Contract Targets"),
    codeTargets: listValue(fields, "Code Targets"),
    notes: fields.notes,
    rationale: fields.rationale,
  };
};

const parseFacadeRelation = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): FacadeRelation | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Facade Relation");
  const from = required(fields, "From", block.line);
  const to = required(fields, "To", block.line);
  const type = required(fields, "Type", block.line);
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
  if (!isOneOf(type, RELATION_TYPES)) {
    return {
      code: "invalid-metadata",
      line: block.line,
      message: `Invalid facade relation enum value for ${base.id}`,
    };
  }
  return {
    ...base,
    from,
    to,
    type: type as RelationType,
    label: fields.scalars.get("Label")?.trim() || undefined,
    notes: fields.notes,
  };
};

export const parseFacadeMapDsl = (content: string): MarkdownDslParseResult => {
  if (!content.trim()) {
    return buildParseFailure("empty-file", 1, "Markdown DSL file is empty");
  }
  const lines = toLines(content);
  const title = lines.find((line) => line.text.trim().length > 0);
  if (!(title && FACADE_TITLE_RE.test(title.text.trim()))) {
    return buildParseFailure(
      "invalid-title",
      title?.number ?? 1,
      "Expected `# Facade Map` title"
    );
  }
  const warnings: MarkdownDslParseWarning[] = [];
  const sections = collectSections(lines.slice(title.number), warnings);
  const metadata = sections.get("Metadata");
  const facades = sections.get("Facades");
  const relations = sections.get("Facade Relations");
  if (!(metadata && facades && relations)) {
    return buildParseFailure(
      "missing-section",
      title.number,
      "Metadata, Facades, and Facade Relations sections are required",
      warnings
    );
  }
  const parsedMetadata = parseMetadata(metadata, warnings);
  if ("ok" in parsedMetadata) {
    return parsedMetadata;
  }
  const parsedFacades = parseEntityCollection(
    collectBlocks(facades, FACADE_HEADER_RE, warnings),
    warnings,
    parseFacade,
    "facade"
  );
  if ("ok" in parsedFacades) {
    return parsedFacades;
  }
  const parsedRelations = parseEntityCollection(
    collectBlocks(relations, FACADE_RELATION_HEADER_RE, warnings),
    warnings,
    parseFacadeRelation,
    "facade relation"
  );
  if ("ok" in parsedRelations) {
    return parsedRelations;
  }
  const value: FacadeMapModel = {
    version: parsedMetadata.version,
    stage: "diagram_facades",
    revision: computeDiagramRevision(content),
    updated: parsedMetadata.updated,
    facades: parsedFacades,
    relations: parsedRelations,
  };
  return { ok: true, value, warnings };
};
