import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const PRODUCT_PART_ID_RE =
  /^###\s+Product Part:\s+([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/gm;
const PRODUCT_PART_ORDERED_ITEM_RE =
  /^(?:\d+\.\s+|###\s+\d+\.\s+)`([a-z0-9]+(?:-[a-z0-9]+)*)`(?:\s+[—-]\s+`[^`]+`)?\s*$/gm;
const PRODUCT_PART_TABLE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`[^`]+`\s*\|\s*.+\|$/gm;

export interface DiagramModulesManagedValidationRequest {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface DiagramModulesManagedValidationResult {
  readonly diagnostics: readonly string[];
  readonly generatedPartIds: readonly string[];
  readonly plannedPartIds: readonly string[];
  readonly valid: boolean;
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

const productPartHasExpectedHeading = (
  content: string,
  partId: string
): boolean => content.includes(`Product Part: ${partId}`);

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
      diagnostics: [`Missing required artifact: ${indexRelativePath}`],
      generatedPartIds: [],
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
      diagnostics.push(`Missing required artifact: ${relativePath}`);
      continue;
    }
    if (!productPartHasExpectedHeading(content, partId)) {
      diagnostics.push(
        `Product Part artifact has invalid heading: ${relativePath}`
      );
      continue;
    }
    generatedPartIds.push(partId);
  }

  const moduleMapRelativePath = relativeDiagramPath(
    request.workspaceSlug,
    "module-map.flow.json"
  );
  const moduleMap = await readRequiredFile(
    path.join(request.workspaceRoot, moduleMapRelativePath)
  );
  if (!moduleMap) {
    diagnostics.push(`Missing required artifact: ${moduleMapRelativePath}`);
  }

  return {
    diagnostics,
    generatedPartIds,
    plannedPartIds,
    valid: diagnostics.length === 0,
  };
};
