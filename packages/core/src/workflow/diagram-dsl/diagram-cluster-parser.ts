import type {
  ClusterEntity,
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
} from "./diagram-dsl-types";
import { type ParsedModule, parseModule } from "./diagram-module-parser";
import {
  type Block,
  collectBlocks,
  type Fields,
  parseEntityCollection,
  parseFields,
} from "./markdown-dsl-shared";

const NESTED_MODULE_HEADER_RE = /^#### Module: (.+)$/;
const SYNTHETIC_PRODUCT_PART_ID = "default-product-part";

export type ParsedCluster = ClusterEntity & {
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

const invalidMetadataError = (
  line: number,
  message: string
): MarkdownDslParseError => ({
  code: "invalid-metadata",
  line,
  message,
});

const missingRequiredFieldError = (
  line: number,
  message: string
): MarkdownDslParseError => ({
  code: "missing-required-field",
  line,
  message,
});

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const splitClusterBlockLines = (
  block: Block
): {
  readonly clusterLines: readonly {
    readonly number: number;
    readonly text: string;
  }[];
  readonly nestedLines: readonly {
    readonly number: number;
    readonly text: string;
  }[];
} => {
  const nestedHeaderIndex = block.lines.findIndex((line) =>
    NESTED_MODULE_HEADER_RE.test(line.text.trim())
  );
  return {
    clusterLines:
      nestedHeaderIndex >= 0
        ? block.lines.slice(0, nestedHeaderIndex)
        : block.lines,
    nestedLines:
      nestedHeaderIndex >= 0 ? block.lines.slice(nestedHeaderIndex) : [],
  };
};

const parseClusterMetadata = (
  block: Block,
  warnings: MarkdownDslParseWarning[],
  expectedProductPart?: string
):
  | {
      readonly id: string;
      readonly moduleIds: readonly string[];
      readonly productPart: string;
      readonly purpose: string;
      readonly title: string;
    }
  | MarkdownDslParseError => {
  const { clusterLines } = splitClusterBlockLines(block);
  const fields = parseFields(
    { id: block.id, line: block.line, lines: clusterLines },
    warnings
  );
  const id = required(fields, "Id", block.line);
  const purpose = required(fields, "Purpose", block.line);
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
  const productPart =
    expectedProductPart ??
    fields.scalars.get("Product Part")?.trim() ??
    SYNTHETIC_PRODUCT_PART_ID;
  if (
    expectedProductPart &&
    fields.scalars.get("Product Part")?.trim() !== expectedProductPart
  ) {
    return invalidMetadataError(
      block.line,
      `Cluster ${id} must declare Product Part: ${expectedProductPart}`
    );
  }
  const moduleIds = listValue(fields, "Modules");
  if (moduleIds.length === 0) {
    return missingRequiredFieldError(
      block.line,
      "Missing required field: Modules"
    );
  }
  return {
    id,
    moduleIds,
    productPart,
    purpose,
    title: fields.scalars.get("Title")?.trim() || humanizeIdentifier(id),
  };
};

const parseClusterNestedModules = (
  block: Block,
  warnings: MarkdownDslParseWarning[],
  clusterId: string,
  expectedProductPart?: string
): readonly ParsedModule[] | MarkdownDslParseError => {
  const { nestedLines } = splitClusterBlockLines(block);
  if (nestedLines.length === 0) {
    return missingRequiredFieldError(
      block.line,
      `Cluster ${clusterId} must contain module blocks`
    );
  }
  const parsedModules = parseEntityCollection(
    collectBlocks(nestedLines, NESTED_MODULE_HEADER_RE, warnings),
    warnings,
    (moduleBlock, moduleWarnings) =>
      parseModule(moduleBlock, moduleWarnings, {
        expectedCluster: clusterId,
        expectedProductPart,
      }),
    "module"
  );
  if (Array.isArray(parsedModules)) {
    return parsedModules;
  }
  const parsedModuleResult = parsedModules as MarkdownDslParseResult;
  if (!parsedModuleResult.ok) {
    return parsedModuleResult.error;
  }
  throw new Error("Unexpected cluster parser success object");
};

const validateOrderedIds = (
  declaredIds: readonly string[],
  nestedIds: readonly string[],
  line: number,
  message: string
): MarkdownDslParseError | null =>
  declaredIds.length !== nestedIds.length ||
  nestedIds.some((entityId, index) => entityId !== declaredIds[index])
    ? invalidMetadataError(line, message)
    : null;

export const parseCluster = (
  block: Block,
  warnings: MarkdownDslParseWarning[],
  expectedProductPart?: string
): ParsedCluster | MarkdownDslParseError => {
  const metadata = parseClusterMetadata(block, warnings, expectedProductPart);
  if ("code" in metadata) {
    return metadata;
  }
  const parsedModules = parseClusterNestedModules(
    block,
    warnings,
    metadata.id,
    expectedProductPart
  );
  if ("code" in parsedModules) {
    return parsedModules;
  }
  const membershipError = validateOrderedIds(
    metadata.moduleIds,
    parsedModules.map((module) => module.id),
    block.line,
    `Cluster ${metadata.id} Modules list must match nested module blocks`
  );
  if (membershipError) {
    return membershipError;
  }
  return {
    ...metadata,
    sourceLine: block.line,
    modules: parsedModules,
  };
};
