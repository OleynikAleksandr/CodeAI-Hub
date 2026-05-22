import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { materializeModuleMapFromStagedProductPart } from "../../workflow/diagram-dsl/staged-product-part-parser";
import {
  buildDiagramModulesProductPartContinuationPrompt,
  buildDiagramModulesUserReviewMessage,
} from "./diagram-modules-prompt-builder";

const PRODUCT_PART_ID_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDERED_ITEM_RE =
  /^(?:\d+\.\s+|###\s+\d+\.\s+)`([a-z0-9]+(?:-[a-z0-9]+)*)`(?:\s+[—-]\s+`[^`]+`)?\s*$/gm;
const PRODUCT_PART_TABLE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`[^`]+`\s*\|\s*.+\|$/gm;
const LEAD_PRODUCT_PART_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:leadProductPartId|Lead Product Part(?: ID)?)\s*[:|]\s*`?([a-z0-9]+(?:-[a-z0-9]+)*)`?/iu;
const LEADERSHIP_ORDER_RE =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:productPartLeadershipOrder|Product Part Leadership Order)\s*[:|]\s*(.+)/iu;
const PRODUCT_PART_ID_IN_TEXT_RE = /`([a-z0-9]+(?:-[a-z0-9]+)*)`/gu;

export interface DiagramModulesManagedValidationRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DiagramModulesManagedValidationResult {
  readonly currentPartId: string | null;
  readonly diagnostics: readonly string[];
  readonly generatedPartIds: readonly string[];
  readonly nextAction:
    | "dispatch_next_product_part"
    | "open_user_review"
    | "repair_current_artifact";
  readonly nextPrompt: string | null;
  readonly plannedPartIds: readonly string[];
  readonly valid: boolean;
}

export interface DiagramModulesLeadershipContract {
  readonly diagnostics: readonly string[];
  readonly leadProductPartId: string | null;
  readonly productPartLeadershipOrder: readonly string[];
}

const relativeDiagramPath = (workspaceSlug: string, suffix: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/${suffix}`;

const readRequiredFile = async (
  absolutePath: string
): Promise<string | null> => {
  const fileStat = await stat(absolutePath).catch(() => null);
  if (!fileStat?.isFile()) {
    return null;
  }
  return readFile(absolutePath, "utf8").catch(() => null);
};

const collectPlannedPartIds = (markdown: string): readonly string[] => {
  const partIds: string[] = [];
  for (const pattern of [
    PRODUCT_PART_ID_RE,
    PRODUCT_PART_ORDERED_ITEM_RE,
    PRODUCT_PART_TABLE_ROW_RE,
  ]) {
    for (const match of markdown.matchAll(pattern)) {
      const partId = match[1]?.trim();
      if (partId && !partIds.includes(partId)) {
        partIds.push(partId);
      }
    }
  }
  return partIds;
};

export const readDiagramModulesLeadershipContract = (params: {
  readonly markdown: string;
  readonly plannedPartIds: readonly string[];
}): DiagramModulesLeadershipContract => {
  const leadProductPartId =
    params.markdown.match(LEAD_PRODUCT_PART_RE)?.[1] ?? null;
  const orderLine = params.markdown.match(LEADERSHIP_ORDER_RE)?.[1] ?? "";
  const productPartLeadershipOrder = [
    ...orderLine.matchAll(PRODUCT_PART_ID_IN_TEXT_RE),
  ]
    .map((match) => match[1])
    .filter((partId): partId is string => Boolean(partId));
  return {
    diagnostics: validateLeadershipContract({
      leadProductPartId,
      plannedPartIds: params.plannedPartIds,
      productPartLeadershipOrder,
    }),
    leadProductPartId,
    productPartLeadershipOrder,
  };
};

const validateLeadershipContract = (params: {
  readonly leadProductPartId: string | null;
  readonly plannedPartIds: readonly string[];
  readonly productPartLeadershipOrder: readonly string[];
}): readonly string[] => {
  const diagnostics: string[] = [];
  if (!params.leadProductPartId) {
    diagnostics.push("Diagram Modules index must declare leadProductPartId.");
  } else if (!params.plannedPartIds.includes(params.leadProductPartId)) {
    diagnostics.push(
      `leadProductPartId must reference a planned Product Part: ${params.leadProductPartId}.`
    );
  }
  if (params.productPartLeadershipOrder.length === 0) {
    diagnostics.push(
      "Diagram Modules index must declare productPartLeadershipOrder."
    );
    return diagnostics;
  }
  const seen = new Set<string>();
  for (const partId of params.productPartLeadershipOrder) {
    if (seen.has(partId)) {
      diagnostics.push(
        `productPartLeadershipOrder contains duplicate Product Part: ${partId}.`
      );
    }
    seen.add(partId);
    if (!params.plannedPartIds.includes(partId)) {
      diagnostics.push(
        `productPartLeadershipOrder references unknown Product Part: ${partId}.`
      );
    }
  }
  for (const partId of params.plannedPartIds) {
    if (!seen.has(partId)) {
      diagnostics.push(
        `productPartLeadershipOrder is missing Product Part: ${partId}.`
      );
    }
  }
  if (
    params.leadProductPartId &&
    params.productPartLeadershipOrder[0] !== params.leadProductPartId
  ) {
    diagnostics.push(
      "The first productPartLeadershipOrder item must equal leadProductPartId."
    );
  }
  return diagnostics;
};

const validateGeneratedProductPart = (params: {
  readonly content: string;
  readonly partId: string;
  readonly relativePath: string;
}): string | null => {
  const parsedPart = materializeModuleMapFromStagedProductPart(params.content);
  if (!parsedPart.ok) {
    return `Product Part artifact is not graph-renderable: ${params.relativePath}: line ${parsedPart.error.line}, ${parsedPart.error.message}`;
  }
  const actualPartId = parsedPart.value.productParts?.[0]?.id;
  return actualPartId === params.partId
    ? null
    : `Product Part artifact id does not match planned id ${params.partId}: ${params.relativePath}`;
};

export const validateDiagramModulesManagedArtifacts = async (
  request: DiagramModulesManagedValidationRequest
): Promise<DiagramModulesManagedValidationResult> => {
  const diagnostics: string[] = [];
  const indexRelativePath = relativeDiagramPath(
    request.workspaceSlug,
    "product-parts.index.md"
  );
  const indexMarkdown = await readRequiredFile(
    path.join(request.workspaceRoot, indexRelativePath)
  );
  if (!indexMarkdown) {
    return {
      currentPartId: null,
      diagnostics: [`Missing required artifact: ${indexRelativePath}`],
      generatedPartIds: [],
      nextAction: "repair_current_artifact",
      nextPrompt: null,
      plannedPartIds: [],
      valid: false,
    };
  }

  const plannedPartIds = collectPlannedPartIds(indexMarkdown);
  if (plannedPartIds.length === 0) {
    diagnostics.push(
      "Diagram Modules index does not declare Product Part ids."
    );
  }
  const leadership = readDiagramModulesLeadershipContract({
    markdown: indexMarkdown,
    plannedPartIds,
  });
  diagnostics.push(...leadership.diagnostics);

  const generatedPartIds: string[] = [];
  for (const partId of plannedPartIds) {
    const relativePath = relativeDiagramPath(
      request.workspaceSlug,
      `product-parts/${partId}.md`
    );
    const content = await readRequiredFile(
      path.join(request.workspaceRoot, relativePath)
    );
    if (!content) {
      return {
        currentPartId: partId,
        diagnostics,
        generatedPartIds,
        nextAction:
          diagnostics.length === 0
            ? "dispatch_next_product_part"
            : "repair_current_artifact",
        nextPrompt:
          diagnostics.length === 0
            ? buildDiagramModulesProductPartContinuationPrompt({
                acceptedPartIds: generatedPartIds,
                currentPartId: partId,
                expectedArtifactPath: relativePath,
              })
            : null,
        plannedPartIds,
        valid: diagnostics.length === 0,
      };
    }
    const validationError = validateGeneratedProductPart({
      content,
      partId,
      relativePath,
    });
    if (validationError) {
      diagnostics.push(validationError);
      return {
        currentPartId: partId,
        diagnostics,
        generatedPartIds,
        nextAction: "repair_current_artifact",
        nextPrompt: null,
        plannedPartIds,
        valid: false,
      };
    }
    generatedPartIds.push(partId);
  }

  return {
    currentPartId: null,
    diagnostics,
    generatedPartIds,
    nextAction:
      diagnostics.length === 0 ? "open_user_review" : "repair_current_artifact",
    nextPrompt:
      diagnostics.length === 0 ? buildDiagramModulesUserReviewMessage() : null,
    plannedPartIds,
    valid: diagnostics.length === 0,
  };
};
