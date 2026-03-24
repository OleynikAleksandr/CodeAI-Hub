import {
  type ClusterEntity,
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
  type ProductPartEntity,
  RELATION_TYPES,
  type RelationType,
} from "./diagram-dsl-types";
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

const DIAGRAM_MODULES_LEGACY_TITLE_RE = /^# Module Inventory$/;
const INVENTORY_SECTION_RE = /^## (.+)$/;
const PRODUCT_PART_HEADER_RE = /^### Product Part: (.+)$/;
const CLUSTER_HEADER_RE = /^### Cluster: (.+)$/;
const STANDALONE_MODULE_HEADER_RE = /^### Module: (.+)$/;
const NESTED_MODULE_HEADER_RE = /^#### Module: (.+)$/;
const RELATION_HEADER_RE = /^### Relation: (.+)$/;
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

type BaseEntity = {
  readonly id: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
};

type ParsedProductPart = ProductPartEntity & {
  readonly sourceLine: number;
};

type ParsedModule = ModuleEntity & {
  readonly sourceLine: number;
};

type ParsedRelation = ModuleRelation & {
  readonly sourceLine: number;
};

type ParsedCluster = ClusterEntity & {
  readonly sourceLine: number;
  readonly modules: readonly ParsedModule[];
};

type InventoryLine = {
  readonly number: number;
  readonly text: string;
};

type ModuleParseOptions = {
  readonly expectedCluster?: string | null;
  readonly expectedProductPart?: string;
};

type ParsedOwnershipStructure = {
  readonly clusters: readonly ParsedCluster[];
  readonly productParts: readonly ParsedProductPart[];
  readonly standaloneModules: readonly ParsedModule[];
};

type ProductPartSectionParseState = {
  currentPartClusters: ParsedCluster[];
  currentPartStandalone: ParsedModule[];
  currentProductPart: ParsedProductPart | null;
  parsedClusters: ParsedCluster[];
  parsedProductParts: ParsedProductPart[];
  parsedStandaloneModules: ParsedModule[];
};

type ProductPartCursorContext = {
  readonly cursor: number;
  readonly lines: readonly InventoryLine[];
  readonly productPartId: string;
  readonly state: ProductPartSectionParseState;
  readonly warnings: readonly MarkdownDslParseWarning[];
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

const humanizeIdentifier = (value: string): string =>
  value
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const isInventoryBoundary = (text: string): boolean =>
  INVENTORY_SECTION_RE.test(text) ||
  PRODUCT_PART_HEADER_RE.test(text) ||
  CLUSTER_HEADER_RE.test(text) ||
  STANDALONE_MODULE_HEADER_RE.test(text) ||
  NESTED_MODULE_HEADER_RE.test(text);

const takeScalarBlockLines = (
  lines: readonly { readonly number: number; readonly text: string }[],
  startIndex: number
): number => {
  let cursor = startIndex;
  while (
    cursor < lines.length &&
    !isInventoryBoundary(lines[cursor]?.text.trim() ?? "")
  ) {
    cursor += 1;
  }
  return cursor;
};

const takeModuleBlockLines = (
  lines: readonly { readonly number: number; readonly text: string }[],
  startIndex: number,
  headerPattern: RegExp
): {
  readonly block: Block;
  readonly nextIndex: number;
} => {
  const id =
    headerPattern.exec(lines[startIndex]?.text.trim() ?? "")?.[1]?.trim() ?? "";
  let cursor = startIndex + 1;
  while (
    cursor < lines.length &&
    !PRODUCT_PART_HEADER_RE.test(lines[cursor]?.text.trim() ?? "") &&
    !CLUSTER_HEADER_RE.test(lines[cursor]?.text.trim() ?? "") &&
    !STANDALONE_MODULE_HEADER_RE.test(lines[cursor]?.text.trim() ?? "") &&
    !NESTED_MODULE_HEADER_RE.test(lines[cursor]?.text.trim() ?? "") &&
    !INVENTORY_SECTION_RE.test(lines[cursor]?.text.trim() ?? "")
  ) {
    cursor += 1;
  }
  return {
    block: {
      id,
      line: lines[startIndex]?.number ?? startIndex + 1,
      lines: lines.slice(startIndex + 1, cursor),
    },
    nextIndex: cursor,
  };
};

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

const toFailureResult = (
  error: MarkdownDslParseError,
  warnings: readonly MarkdownDslParseWarning[]
): MarkdownDslParseResult => ({
  ok: false,
  error,
  warnings,
});

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

const parseModule = (
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

const splitClusterBlockLines = (
  block: Block
): {
  readonly clusterLines: readonly InventoryLine[];
  readonly nestedLines: readonly InventoryLine[];
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
  return Array.isArray(parsedModules)
    ? parsedModules
    : toParseError(parsedModules as MarkdownDslParseResult);
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

const parseCluster = (
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

const createProductPartSectionState = (): ProductPartSectionParseState => ({
  currentPartClusters: [],
  currentPartStandalone: [],
  currentProductPart: null,
  parsedClusters: [],
  parsedProductParts: [],
  parsedStandaloneModules: [],
});

const finalizeCurrentProductPartState = (
  state: ProductPartSectionParseState,
  warnings: readonly MarkdownDslParseWarning[]
): MarkdownDslParseResult | null => {
  if (!state.currentProductPart) {
    return null;
  }
  const membershipError = validateProductPartMembership(
    state.currentProductPart,
    state.currentPartClusters,
    state.currentPartStandalone
  );
  if (membershipError) {
    return toFailureResult(membershipError, warnings);
  }
  state.parsedProductParts.push(state.currentProductPart);
  state.parsedClusters.push(...state.currentPartClusters);
  state.parsedStandaloneModules.push(...state.currentPartStandalone);
  state.currentProductPart = null;
  state.currentPartClusters = [];
  state.currentPartStandalone = [];
  return null;
};

const parseProductPartAtCursor = (
  lines: readonly InventoryLine[],
  cursor: number,
  warnings: readonly MarkdownDslParseWarning[],
  state: ProductPartSectionParseState
): number | MarkdownDslParseResult => {
  const finalized = finalizeCurrentProductPartState(state, warnings);
  if (finalized) {
    return finalized;
  }
  const nextIndex = takeScalarBlockLines(lines, cursor + 1);
  const productPart = parseProductPart(
    {
      id:
        PRODUCT_PART_HEADER_RE.exec(
          lines[cursor]?.text.trim() ?? ""
        )?.[1]?.trim() ?? "",
      line: lines[cursor]?.number ?? cursor + 1,
      lines: lines.slice(cursor + 1, nextIndex),
    },
    warnings as MarkdownDslParseWarning[]
  );
  if ("code" in productPart) {
    return toFailureResult(productPart, warnings);
  }
  state.currentProductPart = productPart;
  return nextIndex;
};

const requireCurrentProductPart = (
  state: ProductPartSectionParseState,
  line: number,
  warnings: readonly MarkdownDslParseWarning[]
): MarkdownDslParseResult | null =>
  state.currentProductPart
    ? null
    : buildParseFailure(
        "invalid-metadata",
        line,
        "Product Parts section must start with a Product Part block",
        warnings
      );

const findProductPartChildBoundary = (
  lines: readonly InventoryLine[],
  cursor: number
): number => {
  for (let index = cursor + 1; index < lines.length; index += 1) {
    const trimmed = lines[index]?.text.trim() ?? "";
    if (
      PRODUCT_PART_HEADER_RE.test(trimmed) ||
      CLUSTER_HEADER_RE.test(trimmed) ||
      STANDALONE_MODULE_HEADER_RE.test(trimmed) ||
      INVENTORY_SECTION_RE.test(trimmed)
    ) {
      return index;
    }
  }
  return lines.length;
};

const parseProductPartClusterAtCursor = (
  context: ProductPartCursorContext
): number | MarkdownDslParseResult => {
  const boundary = findProductPartChildBoundary(context.lines, context.cursor);
  const cluster = parseCluster(
    {
      id:
        CLUSTER_HEADER_RE.exec(
          context.lines[context.cursor]?.text.trim() ?? ""
        )?.[1]?.trim() ?? "",
      line: context.lines[context.cursor]?.number ?? context.cursor + 1,
      lines: context.lines.slice(context.cursor + 1, boundary),
    },
    context.warnings as MarkdownDslParseWarning[],
    context.productPartId
  );
  if ("code" in cluster) {
    return toFailureResult(cluster, context.warnings);
  }
  context.state.currentPartClusters.push(cluster);
  return boundary;
};

const isProductPartStandaloneModuleHeader = (text: string): boolean =>
  STANDALONE_MODULE_HEADER_RE.test(text) || NESTED_MODULE_HEADER_RE.test(text);

const parseProductPartStandaloneModuleAtCursor = (
  context: ProductPartCursorContext
): number | MarkdownDslParseResult => {
  const headerPattern = STANDALONE_MODULE_HEADER_RE.test(
    context.lines[context.cursor]?.text.trim() ?? ""
  )
    ? STANDALONE_MODULE_HEADER_RE
    : NESTED_MODULE_HEADER_RE;
  const { block, nextIndex } = takeModuleBlockLines(
    context.lines,
    context.cursor,
    headerPattern
  );
  const module = parseModule(
    block,
    context.warnings as MarkdownDslParseWarning[],
    {
      expectedCluster: null,
      expectedProductPart: context.productPartId,
    }
  );
  if ("code" in module) {
    return toFailureResult(module, context.warnings);
  }
  context.state.currentPartStandalone.push(module);
  return nextIndex;
};

const advanceProductPartsCursor = (
  lines: readonly InventoryLine[],
  cursor: number,
  warnings: readonly MarkdownDslParseWarning[],
  state: ProductPartSectionParseState
): number | MarkdownDslParseResult => {
  const lineNumber = lines[cursor]?.number ?? cursor + 1;
  const trimmed = lines[cursor]?.text.trim() ?? "";
  if (trimmed.length === 0) {
    return cursor + 1;
  }
  if (PRODUCT_PART_HEADER_RE.test(trimmed)) {
    return parseProductPartAtCursor(lines, cursor, warnings, state);
  }
  const missingProductPart = requireCurrentProductPart(
    state,
    lineNumber,
    warnings
  );
  if (missingProductPart) {
    return missingProductPart;
  }
  const context: ProductPartCursorContext = {
    cursor,
    lines,
    productPartId: state.currentProductPart?.id ?? "",
    state,
    warnings,
  };
  if (CLUSTER_HEADER_RE.test(trimmed)) {
    return parseProductPartClusterAtCursor(context);
  }
  return isProductPartStandaloneModuleHeader(trimmed)
    ? parseProductPartStandaloneModuleAtCursor(context)
    : cursor + 1;
};

const parseProductPartsSection = (
  lines: readonly InventoryLine[],
  warnings: MarkdownDslParseWarning[]
): ParsedOwnershipStructure | MarkdownDslParseResult => {
  const state = createProductPartSectionState();
  let cursor = 0;
  while (cursor < lines.length) {
    const nextCursor = advanceProductPartsCursor(
      lines,
      cursor,
      warnings,
      state
    );
    if (typeof nextCursor !== "number") {
      return nextCursor;
    }
    cursor = nextCursor;
  }
  const finalized = finalizeCurrentProductPartState(state, warnings);
  if (finalized) {
    return finalized;
  }
  return {
    productParts: state.parsedProductParts,
    clusters: state.parsedClusters,
    standaloneModules: state.parsedStandaloneModules,
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
    return parseProductPartsSection(sections.productParts, warnings);
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
  const parsedRelations = parseEntityCollection(
    collectBlocks(validatedSections.relations, RELATION_HEADER_RE, warnings),
    warnings,
    parseRelation,
    "relation"
  );
  if (!Array.isArray(parsedRelations)) {
    return parsedRelations as MarkdownDslParseResult;
  }
  const relationRecords = parsedRelations as readonly ParsedRelation[];

  const uniqueModulesError = validateModuleUniqueness(
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
