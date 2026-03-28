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
  type ModuleRelation,
  RELATION_TYPES,
  type RelationType,
} from "./diagram-dsl-types";
import {
  type Block,
  collectBlocks,
  type Fields,
  isOneOf,
  parseEntityCollection,
  parseFields,
} from "./markdown-dsl-shared";

const RELATION_HEADER_RE = /^### Relation: (.+)$/;

interface BaseEntity {
  readonly id: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
}

export type ParsedRelation = ModuleRelation & {
  readonly sourceLine: number;
};

const fail = (
  code: MarkdownDslParseError["code"],
  line: number,
  message: string
): MarkdownDslParseError => ({ code, line, message });

const required = (
  fields: Fields,
  key: string,
  line: number
): string | MarkdownDslParseError =>
  fields.scalars.get(key)?.trim() ||
  fail("missing-required-field", line, `Missing required field: ${key}`);

const parseBaseEntity = (
  fields: Fields,
  block: Block
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
    return fail(
      "invalid-entity-id",
      block.line,
      "Relation header Id must match field Id"
    );
  }
  return isOneOf(origin, ENTITY_ORIGINS) && isOneOf(status, ENTITY_STATUSES)
    ? { id, origin, status }
    : fail(
        "invalid-metadata",
        block.line,
        `Invalid relation enum value for ${id}`
      );
};

const parseRelation = (
  block: Block,
  warnings: MarkdownDslParseWarning[]
): ParsedRelation | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block);
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
    return fail(
      "invalid-metadata",
      block.line,
      `Invalid relation enum value for ${base.id}`
    );
  }
  return {
    ...base,
    from,
    to,
    type: type as RelationType,
    label: fields.scalars.get("Label")?.trim() || undefined,
    criticality: criticality as Criticality | undefined,
    notes: fields.notes,
    sourceLine: block.line,
  };
};

export const parseRelationsSection = (
  lines: readonly { readonly number: number; readonly text: string }[],
  warnings: MarkdownDslParseWarning[]
): readonly ParsedRelation[] | MarkdownDslParseResult => {
  const parsed = parseEntityCollection(
    collectBlocks(lines, RELATION_HEADER_RE, warnings),
    warnings,
    parseRelation,
    "relation"
  );
  return Array.isArray(parsed) ? parsed : parsed;
};

export const validateRelationEndpoints = (
  modules: readonly { readonly id: string }[],
  relations: readonly ParsedRelation[]
): MarkdownDslParseError | null => {
  const moduleIds = new Set(modules.map((module) => module.id));
  for (const relation of relations) {
    if (!moduleIds.has(relation.from)) {
      return fail(
        "invalid-metadata",
        relation.sourceLine,
        `Relation ${relation.id} references unknown module ${relation.from}`
      );
    }
    if (!moduleIds.has(relation.to)) {
      return fail(
        "invalid-metadata",
        relation.sourceLine,
        `Relation ${relation.id} references unknown module ${relation.to}`
      );
    }
  }
  return null;
};
