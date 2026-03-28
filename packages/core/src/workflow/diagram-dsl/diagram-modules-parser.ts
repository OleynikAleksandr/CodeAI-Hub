import type {
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
  ModuleMapModel,
} from "./diagram-dsl-types";
import {
  type ParsedOwnershipStructure,
  parseOwnershipSections,
  parseProductPart,
  validateInventorySections,
  validateProductPartMembership,
} from "./diagram-legacy-ownership-parser";
import { validateParsedModuleUniqueness } from "./diagram-module-parser";
import { parseProductPartsSection } from "./diagram-ownership-parser";
import {
  type ParsedRelation,
  parseRelationsSection,
  validateRelationEndpoints,
} from "./diagram-relations-parser";
import {
  buildParseFailure,
  computeDiagramRevision,
  parseFields,
  toLines,
} from "./markdown-dsl-shared";

const DIAGRAM_MODULES_LEGACY_TITLE_RE = /^# Module Inventory$/;
const INVENTORY_SECTION_RE = /^## (.+)$/;
const INVENTORY_SECTION_NAMES = new Set([
  "Metadata",
  "Product Parts",
  "Clusters",
  "Standalone Modules",
  "Simple Relations",
  "Assumptions / Open Questions",
]);

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
    warnings,
    () =>
      parseProductPartsSection({
        lines: validatedSections.productParts ?? [],
        warnings,
        parseProductPart,
        validateProductPartMembership,
      })
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
