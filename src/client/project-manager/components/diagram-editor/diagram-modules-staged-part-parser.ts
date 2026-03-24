import type {
  MaterializedStagedProductPartResult,
} from "./diagram-modules-staged-part-parser-shared";
import {
  buildFailure,
  buildModuleMap,
  collectSections,
  humanizeIdentifier,
  normalizeCell,
  normalizeParagraph,
  parseClusters,
  parseFieldTable,
  parseModuleRows,
} from "./diagram-modules-staged-part-parser-shared";

const INVENTORY_TITLE_RE = /^# Module Inventory$/m;
const OUTLINE_TITLE_RE = /^# Product Part:\s+(.+)\s*$/m;
const OUTLINE_PART_ID_RE = /^- `part_id`:\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/m;
const PRODUCT_PART_TITLE_RE = /^Product Part:\s*`([^`]+)`\s*$/m;
const SECTION_RE = /^## (.+)$/gm;
const TABLE_ROW_RE = /^\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|$/gm;
const CLUSTER_HEADER_RE =
  /^### Cluster(?: \d+\.)?\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const OUTLINE_CLUSTER_HEADER_RE =
  /^###(?:\s+\d+\.|\s+Cluster:)?\s+`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*$/gm;
const PURPOSE_RE = /^\*\*Purpose:\*\*\s+(.+)$/m;
const MODULE_ROW_RE =
  /^\|\s*\d+\s*\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|$/gm;
const OUTLINE_MODULE_ROW_RE =
  /^\|\s*`([a-z0-9]+(?:-[a-z0-9]+)*)`\s*\|\s*`([^`]+)`\s*\|\s*(?:`[^`]+`[ \t]*\|[ \t]*)?(.+?)[ \t]*\|$/gm;

const materializeModuleMapFromProductPartOutline = (
  content: string,
  title: string
): MaterializedStagedProductPartResult => {
  const productPartTitle = title.match(OUTLINE_TITLE_RE)?.[1]?.trim();
  if (!productPartTitle) {
    return buildFailure("invalid-title", 1, "Expected `# Product Part: <title>` title");
  }

  const sections = collectSections(content, SECTION_RE);
  const identityFields = sections.get("Identity")
    ? parseFieldTable(sections.get("Identity")!, TABLE_ROW_RE)
    : new Map<string, string>();
  const purposeSection = sections.get("Purpose");
  const purpose =
    normalizeParagraph(purposeSection?.body ?? "") ||
    identityFields.get("Purpose")?.trim() ||
    "";
  const productPartId =
    content.match(OUTLINE_PART_ID_RE)?.[1]?.trim() ??
    identityFields.get("Part ID")?.trim() ??
    identityFields.get("Id")?.trim();
  if (!productPartId) {
    return buildFailure("missing-required-field", 1, "Missing required field: part_id");
  }
  if (!purpose) {
    return buildFailure(
      "missing-required-field",
      purposeSection?.line ?? 1,
      "Missing required section content: Purpose"
    );
  }

  return buildModuleMap({
    content,
    productPartId,
    productPartTitle:
      identityFields.get("Product Part")?.trim() ??
      identityFields.get("Name")?.trim() ??
      normalizeCell(productPartTitle),
    purpose,
    ...(() => {
      const clusterResult = parseClusters({
        section:
          sections.get("Owned Clusters") ?? sections.get("Cluster Inventory") ?? sections.get("Cluster Ownership"),
        productPartId,
        headerPattern: OUTLINE_CLUSTER_HEADER_RE,
        rowPattern: OUTLINE_MODULE_ROW_RE,
        purposePattern: PURPOSE_RE,
      });
      return {
        clusters: clusterResult.clusters,
        clusterModules: clusterResult.modules,
      };
    })(),
    standaloneModules: parseModuleRows(
      (
        sections.get("Direct Standalone Modules Under This Part") ??
        sections.get("Standalone Modules") ??
        sections.get("Owned Standalone Modules")
      )?.body ?? "",
      productPartId,
      OUTLINE_MODULE_ROW_RE
    ),
  });
};

const materializeModuleMapFromInventoryProductPart = (
  content: string,
  title: string
): MaterializedStagedProductPartResult => {
  if (!INVENTORY_TITLE_RE.test(title)) {
    return buildFailure("invalid-title", 1, "Expected `# Module Inventory` title");
  }

  const sections = collectSections(content, SECTION_RE);
  const productPartSection = sections.get("Product Part");
  if (!productPartSection) {
    return buildFailure(
      "missing-section",
      1,
      "Expected `## Product Part` section in staged Product Part file"
    );
  }

  const fields = parseFieldTable(productPartSection, TABLE_ROW_RE);
  const productPartId = fields.get("Part ID")?.trim();
  const productPartTitle =
    fields.get("Product Part")?.trim() ??
    content.match(PRODUCT_PART_TITLE_RE)?.[1]?.trim();
  const purpose = fields.get("Purpose")?.trim();
  if (!productPartId) {
    return buildFailure(
      "missing-required-field",
      productPartSection.line,
      "Missing required field: Part ID"
    );
  }
  if (!purpose) {
    return buildFailure(
      "missing-required-field",
      productPartSection.line,
      "Missing required field: Purpose"
    );
  }

  const clusterResult = parseClusters({
    section: sections.get("Clusters"),
    productPartId,
    headerPattern: CLUSTER_HEADER_RE,
    rowPattern: MODULE_ROW_RE,
    purposePattern: PURPOSE_RE,
  });

  return buildModuleMap({
    content,
    productPartId,
    productPartTitle: productPartTitle ?? humanizeIdentifier(productPartId),
    purpose,
    clusters: clusterResult.clusters,
    clusterModules: clusterResult.modules,
    standaloneModules: parseModuleRows(
      sections.get("Standalone Modules")?.body ?? "",
      productPartId,
      MODULE_ROW_RE
    ),
  });
};

export const materializeModuleMapFromStagedProductPart = (
  content: string
): MaterializedStagedProductPartResult => {
  const title = content
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)
    ?.trim();
  if (!title) {
    return buildFailure("invalid-title", 1, "Expected staged Product Part title");
  }
  if (OUTLINE_TITLE_RE.test(title)) {
    return materializeModuleMapFromProductPartOutline(content, title);
  }
  return materializeModuleMapFromInventoryProductPart(content, title);
};
