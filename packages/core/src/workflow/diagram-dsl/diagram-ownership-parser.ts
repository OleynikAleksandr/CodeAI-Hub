import { type ParsedCluster, parseCluster } from "./diagram-cluster-parser";
import type {
  MarkdownDslParseError,
  MarkdownDslParseResult,
  MarkdownDslParseWarning,
} from "./diagram-dsl-types";
import { type ParsedModule, parseModule } from "./diagram-module-parser";
import { type Block, buildParseFailure } from "./markdown-dsl-shared";

const INVENTORY_SECTION_RE = /^## (.+)$/;
const PRODUCT_PART_HEADER_RE = /^### Product Part: (.+)$/;
const CLUSTER_HEADER_RE = /^### Cluster: (.+)$/;
const STANDALONE_MODULE_HEADER_RE = /^### Module: (.+)$/;
const NESTED_MODULE_HEADER_RE = /^#### Module: (.+)$/;

interface InventoryLine {
  readonly number: number;
  readonly text: string;
}

interface ProductPartSectionParseState<TProductPart> {
  currentPartClusters: ParsedCluster[];
  currentPartStandalone: ParsedModule[];
  currentProductPart: TProductPart | null;
  parsedClusters: ParsedCluster[];
  parsedProductParts: TProductPart[];
  parsedStandaloneModules: ParsedModule[];
}

const toFailureResult = (
  error: MarkdownDslParseError,
  warnings: readonly MarkdownDslParseWarning[]
): MarkdownDslParseResult => ({
  ok: false,
  error,
  warnings,
});

const createProductPartSectionState = <
  TProductPart,
>(): ProductPartSectionParseState<TProductPart> => ({
  currentPartClusters: [],
  currentPartStandalone: [],
  currentProductPart: null,
  parsedClusters: [],
  parsedProductParts: [],
  parsedStandaloneModules: [],
});

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
      NESTED_MODULE_HEADER_RE.test(trimmed) ||
      INVENTORY_SECTION_RE.test(trimmed)
    ) {
      return index;
    }
  }
  return lines.length;
};

const requireCurrentProductPart = <TProductPart>(
  state: ProductPartSectionParseState<TProductPart>,
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

export const parseProductPartsSection = <
  TProductPart extends { readonly id: string },
>(params: {
  readonly lines: readonly InventoryLine[];
  readonly warnings: MarkdownDslParseWarning[];
  readonly parseProductPart: (
    block: Block,
    warnings: MarkdownDslParseWarning[]
  ) => TProductPart | MarkdownDslParseError;
  readonly validateProductPartMembership: (
    productPart: TProductPart,
    clusters: readonly ParsedCluster[],
    standaloneModules: readonly ParsedModule[]
  ) => MarkdownDslParseError | null;
}):
  | {
      readonly productParts: readonly TProductPart[];
      readonly clusters: readonly ParsedCluster[];
      readonly standaloneModules: readonly ParsedModule[];
    }
  | MarkdownDslParseResult => {
  const finalizeCurrentProductPartState = (): MarkdownDslParseResult | null => {
    if (!state.currentProductPart) {
      return null;
    }
    const membershipError = params.validateProductPartMembership(
      state.currentProductPart,
      state.currentPartClusters,
      state.currentPartStandalone
    );
    if (membershipError) {
      return toFailureResult(membershipError, params.warnings);
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
    cursor: number
  ): number | MarkdownDslParseResult => {
    const finalized = finalizeCurrentProductPartState();
    if (finalized) {
      return finalized;
    }
    const nextIndex = findProductPartChildBoundary(params.lines, cursor);
    const productPart = params.parseProductPart(
      {
        id:
          PRODUCT_PART_HEADER_RE.exec(
            params.lines[cursor]?.text.trim() ?? ""
          )?.[1]?.trim() ?? "",
        line: params.lines[cursor]?.number ?? cursor + 1,
        lines: params.lines.slice(cursor + 1, nextIndex),
      },
      params.warnings
    );
    if ("code" in productPart) {
      return toFailureResult(productPart, params.warnings);
    }
    state.currentProductPart = productPart;
    return nextIndex;
  };

  const parseClusterAtCursor = (
    cursor: number,
    boundary: number,
    trimmed: string
  ): number | MarkdownDslParseResult => {
    const cluster = parseCluster(
      {
        id: CLUSTER_HEADER_RE.exec(trimmed)?.[1]?.trim() ?? "",
        line: params.lines[cursor]?.number ?? cursor + 1,
        lines: params.lines.slice(cursor + 1, boundary),
      },
      params.warnings,
      state.currentProductPart?.id
    );
    if ("code" in cluster) {
      return toFailureResult(cluster, params.warnings);
    }
    state.currentPartClusters.push(cluster);
    return boundary;
  };

  const parseStandaloneModuleAtCursor = (
    cursor: number,
    boundary: number,
    trimmed: string
  ): number | MarkdownDslParseResult => {
    const module = parseModule(
      {
        id:
          (STANDALONE_MODULE_HEADER_RE.exec(trimmed) ??
            NESTED_MODULE_HEADER_RE.exec(trimmed))?.[1]?.trim() ?? "",
        line: params.lines[cursor]?.number ?? cursor + 1,
        lines: params.lines.slice(cursor + 1, boundary),
      },
      params.warnings,
      {
        expectedCluster: null,
        expectedProductPart: state.currentProductPart?.id,
      }
    );
    if ("code" in module) {
      return toFailureResult(module, params.warnings);
    }
    state.currentPartStandalone.push(module);
    return boundary;
  };

  const advanceProductPartsCursor = (
    cursor: number
  ): number | MarkdownDslParseResult => {
    const trimmed = params.lines[cursor]?.text.trim() ?? "";
    if (trimmed.length === 0) {
      return cursor + 1;
    }
    if (PRODUCT_PART_HEADER_RE.test(trimmed)) {
      return parseProductPartAtCursor(cursor);
    }
    const missingProductPart = requireCurrentProductPart(
      state,
      params.lines[cursor]?.number ?? cursor + 1,
      params.warnings
    );
    if (missingProductPart) {
      return missingProductPart;
    }
    const boundary = findProductPartChildBoundary(params.lines, cursor);
    if (CLUSTER_HEADER_RE.test(trimmed)) {
      return parseClusterAtCursor(cursor, boundary, trimmed);
    }
    if (
      STANDALONE_MODULE_HEADER_RE.test(trimmed) ||
      NESTED_MODULE_HEADER_RE.test(trimmed)
    ) {
      return parseStandaloneModuleAtCursor(cursor, boundary, trimmed);
    }
    return cursor + 1;
  };

  const state = createProductPartSectionState<TProductPart>();
  let cursor = 0;
  while (cursor < params.lines.length) {
    const nextCursor = advanceProductPartsCursor(cursor);
    if (typeof nextCursor !== "number") {
      return nextCursor;
    }
    cursor = nextCursor;
  }
  const finalized = finalizeCurrentProductPartState();
  if (finalized) {
    return finalized;
  }
  return {
    productParts: state.parsedProductParts,
    clusters: state.parsedClusters,
    standaloneModules: state.parsedStandaloneModules,
  };
};
