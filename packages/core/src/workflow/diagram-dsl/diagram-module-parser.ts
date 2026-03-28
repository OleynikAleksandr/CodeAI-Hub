import {
  ENTITY_ORIGINS,
  ENTITY_STATUSES,
  type EntityOrigin,
  type EntityStatus,
  type MarkdownDslParseError,
  type MarkdownDslParseWarning,
  MODULE_KINDS,
  type ModuleEntity,
  type ModuleKind,
} from "./diagram-dsl-types";
import {
  type Block,
  type Fields,
  isOneOf,
  parseFields,
} from "./markdown-dsl-shared";

interface BaseEntity {
  readonly id: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
}

export interface ModuleParseOptions {
  readonly expectedCluster?: string | null;
  readonly expectedProductPart?: string;
}

export type ParsedModule = ModuleEntity & {
  readonly sourceLine: number;
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

const invalidMetadataError = (
  line: number,
  message: string
): MarkdownDslParseError => ({
  code: "invalid-metadata",
  line,
  message,
});

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
    return invalidMetadataError(
      block.line,
      `Invalid ${entityLabel.toLowerCase()} enum value for ${id}`
    );
  }
  return { id, origin, status };
};

const validateModuleKind = (
  kind: string,
  moduleId: string,
  line: number
): MarkdownDslParseError | null =>
  isOneOf(kind, MODULE_KINDS)
    ? null
    : invalidMetadataError(line, `Invalid module enum value for ${moduleId}`);

const validateModuleProductPart = (
  moduleId: string,
  line: number,
  declaredProductPart: string | undefined,
  options?: ModuleParseOptions
): MarkdownDslParseError | null =>
  options?.expectedProductPart &&
  declaredProductPart !== options.expectedProductPart
    ? invalidMetadataError(
        line,
        `Module ${moduleId} must declare Product Part: ${options.expectedProductPart}`
      )
    : null;

const validateModuleCluster = (
  moduleId: string,
  line: number,
  declaredCluster: string | undefined,
  options?: ModuleParseOptions
): MarkdownDslParseError | null => {
  if (options?.expectedCluster) {
    return declaredCluster === options.expectedCluster
      ? null
      : invalidMetadataError(
          line,
          `Cluster module ${moduleId} must declare Cluster: ${options.expectedCluster}`
        );
  }
  if (options?.expectedCluster === null && declaredCluster) {
    return invalidMetadataError(
      line,
      `Standalone module ${moduleId} must not declare Cluster`
    );
  }
  return null;
};

const resolveModuleOwnership = (
  declaredProductPart: string | undefined,
  options?: ModuleParseOptions
): Pick<ParsedModule, "cluster" | "productPart"> => ({
  cluster: options?.expectedCluster ?? undefined,
  productPart: options?.expectedProductPart ?? declaredProductPart,
});

export const parseModule = (
  block: Block,
  warnings: MarkdownDslParseWarning[],
  options?: ModuleParseOptions
): ParsedModule | MarkdownDslParseError => {
  const fields = parseFields(block, warnings);
  const base = parseBaseEntity(fields, block, "Module");
  const kind = required(fields, "Kind", block.line);
  const title = required(fields, "Title", block.line);
  const responsibility = required(fields, "Responsibility", block.line);
  const productPart = fields.scalars.get("Product Part")?.trim() || undefined;
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
  for (const validationError of [
    validateModuleKind(kind, base.id, block.line),
    validateModuleProductPart(base.id, block.line, productPart, options),
    validateModuleCluster(base.id, block.line, cluster, options),
  ]) {
    if (validationError) {
      return validationError;
    }
  }
  const ownership = resolveModuleOwnership(productPart, options);
  return {
    ...base,
    kind: kind as ModuleKind,
    title,
    responsibility,
    ...ownership,
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

export const validateParsedModuleUniqueness = (
  clusters: readonly { readonly modules: readonly ParsedModule[] }[],
  standaloneModules: readonly ParsedModule[]
): MarkdownDslParseError | null => {
  const seen = new Map<string, number>();
  for (const module of [
    ...clusters.flatMap((cluster) => cluster.modules),
    ...standaloneModules,
  ]) {
    if (typeof seen.get(module.id) === "number") {
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
