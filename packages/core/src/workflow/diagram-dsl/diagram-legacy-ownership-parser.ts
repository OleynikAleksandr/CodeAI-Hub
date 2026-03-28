import { type ParsedCluster, parseCluster } from "./diagram-cluster-parser";
import type {
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
  ProductPartEntity,
} from "./diagram-dsl-types";
import { type ParsedModule, parseModule } from "./diagram-module-parser";
import {
  type Block,
  buildParseFailure,
  collectBlocks,
  type Fields,
  parseEntityCollection,
  parseFields,
} from "./markdown-dsl-shared";

const CLUSTER_HEADER_RE = /^### Cluster: (.+)$/;
const STANDALONE_MODULE_HEADER_RE = /^### Module: (.+)$/;
const SYNTHETIC_PRODUCT_PART_ID = "default-product-part";
const SYNTHETIC_PRODUCT_PART_TITLE = "Default Product Part";

export type ParsedProductPart = ProductPartEntity & {
  readonly sourceLine: number;
};

export interface ParsedOwnershipStructure {
  readonly clusters: readonly ParsedCluster[];
  readonly productParts: readonly ParsedProductPart[];
  readonly standaloneModules: readonly ParsedModule[];
}

export interface ValidatedInventorySections {
  readonly clusters?: readonly {
    readonly number: number;
    readonly text: string;
  }[];
  readonly metadata: readonly {
    readonly number: number;
    readonly text: string;
  }[];
  readonly productParts?: readonly {
    readonly number: number;
    readonly text: string;
  }[];
  readonly relations: readonly {
    readonly number: number;
    readonly text: string;
  }[];
  readonly standalone?: readonly {
    readonly number: number;
    readonly text: string;
  }[];
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

export const parseProductPart = (
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

export const validateProductPartMembership = (
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

export const validateInventorySections = (
  titleLine: number,
  warnings: readonly MarkdownDslParseWarning[],
  sections: ReadonlyMap<
    string,
    readonly { readonly number: number; readonly text: string }[]
  >
): ValidatedInventorySections | MarkdownDslParseResult => {
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
  clusters: readonly { readonly number: number; readonly text: string }[],
  standalone: readonly { readonly number: number; readonly text: string }[],
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
    parsedClusters,
    parsedStandalone
  );
};

export const parseOwnershipSections = (
  titleLine: number,
  sections: {
    readonly clusters?: readonly {
      readonly number: number;
      readonly text: string;
    }[];
    readonly productParts?: readonly {
      readonly number: number;
      readonly text: string;
    }[];
    readonly standalone?: readonly {
      readonly number: number;
      readonly text: string;
    }[];
  },
  warnings: MarkdownDslParseWarning[],
  parseProductPartsSection: () =>
    | ParsedOwnershipStructure
    | MarkdownDslParseResult
): ParsedOwnershipStructure | MarkdownDslParseResult => {
  if (sections.productParts) {
    return parseProductPartsSection();
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
