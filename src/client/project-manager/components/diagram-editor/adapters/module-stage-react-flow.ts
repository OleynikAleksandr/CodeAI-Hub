import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import type { DiagramFlowNode } from "./domain-model-to-react-flow.types";

type ModuleEntity = ModuleMapModel["modules"][number];
type ClusterEntity = NonNullable<ModuleMapModel["clusters"]>[number];
type ProductPartEntity = NonNullable<ModuleMapModel["productParts"]>[number];

// -- Layout geometry (non-CSS) --
const PRODUCT_PART_PADDING_X = 24, PRODUCT_PART_PADDING_BOTTOM = 12, PRODUCT_PART_HEADER_BODY_GAP = 12;
const PRODUCT_PART_SECTION_GAP = 12, PRODUCT_PART_ROW_GAP = 24, PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS = 3, PRODUCT_PART_EXTERNAL_GAP = 72;
const CLUSTER_X_STEP = 320, CLUSTER_PADDING_X = 24, CLUSTER_BOTTOM_PADDING = 12;
const MODULE_X_OFFSET = 24, MODULE_CARD_WIDTH = 240, MODULE_CARD_GAP = 12;
const STANDALONE_X_STEP = CLUSTER_X_STEP, DEFAULT_PRODUCT_PART_ID = "default-product-part";
const CLUSTER_MULTI_COL_THRESHOLD = 2;
const getClusterModuleCols = (n: number): number => n > CLUSTER_MULTI_COL_THRESHOLD ? 2 : 1;
const getClusterInnerWidth = (cols: number): number => MODULE_X_OFFSET + cols * MODULE_CARD_WIDTH + Math.max(cols - 1, 0) * MODULE_CARD_GAP + CLUSTER_PADDING_X;
// -- CSS-faithful height computation (mirrors diagram-editor-facade.tsx styles) --
const LH11 = 14, LH12 = 15, LH13 = 16, LH14 = 17, LH15 = 18; // Math.ceil(fontSize * 1.2)
const LH12_135 = 17; // Math.ceil(12 * 1.35) — module responsibility lineHeight:1.35
// Module card: nodeCardStyle padding "12px 14px", content width 212px
const MC_PAD = 12, MC_CONTENT_W = MODULE_CARD_WIDTH - 28;
const MC_TITLE_CPL = Math.floor(MC_CONTENT_W / 9); // bold 14px, conservative for Space Grotesk + Cyrillic
const MC_RESP_CPL = Math.floor(MC_CONTENT_W / 8.4);  // regular 12px, conservative to avoid dense localized overlap
// Cluster: clusterCardStyle padding "14px 14px 18px", containerHeaderStyle gap:4
const CL_PAD_TOP = 14, CL_GAP = 4, CL_CONTENT_W = CLUSTER_X_STEP - CLUSTER_PADDING_X * 2 - 28;
const CL_TITLE_CPL = Math.floor(CL_CONTENT_W / 8.4), CL_PURPOSE_CPL = Math.floor(CL_CONTENT_W / 7.2);
const CL_PURPOSE_LH = 16; // Math.ceil(11 * 1.4) — purposeTextStyle lineHeight:1.4
// Product part: productPartCardStyle padding "18px 18px 22px"
const PP_CARD_PAD_TOP = 18, PP_TITLE_CPL = 30, PP_PURPOSE_PAD = 10;

const toProductPartNodeId = (productPartId: string): string => `product-part:${productPartId}`;
const toClusterNodeId = (clusterId: string): string => `cluster:${clusterId}`;
const compareById = <T extends { readonly id: string }>(left: T, right: T): number => left.id.localeCompare(right.id);
const humanizeIdentifier = (value: string): string =>
  value.split("-").filter(Boolean).map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
const estimateTextLines = (text: string, charsPerLine: number): number =>
  text.split(/\r?\n/u).map((line) => Math.max(1, Math.ceil(line.trim().length / charsPerLine))).reduce((sum, count) => sum + count, 0);
// Module card height from CSS: pad + "MODULE" + mt4+title + mt4+kind + mt6+resp + mt8+label + pad
const getModuleCardHeight = (module: ModuleEntity): number =>
  Math.ceil(MC_PAD + LH11 + 4 + estimateTextLines(module.title, MC_TITLE_CPL) * LH14 + 4 + LH11 + 6 + estimateTextLines(module.responsibility, MC_RESP_CPL) * LH12_135 + 8 + LH11 + MC_PAD);
// Cluster header: pad-top + grid(caption, title, meta, purpose) + gap to first module
const getClusterHeaderHeight = (cluster: Pick<ClusterEntity, "title" | "purpose">): number =>
  Math.ceil(CL_PAD_TOP + LH11 + CL_GAP + estimateTextLines(cluster.title, CL_TITLE_CPL) * LH13 + CL_GAP + LH11 + CL_GAP + 6 + estimateTextLines(cluster.purpose, CL_PURPOSE_CPL) * CL_PURPOSE_LH + MODULE_CARD_GAP);
// Product part summary: caption + gap + title + gap + meta
const getProductPartSummaryHeight = (title: string): number =>
  LH11 + 4 + estimateTextLines(title, PP_TITLE_CPL) * LH15 + 4 + LH12;
// Purpose panel: padding + caption + mt6 + text + padding
const getPurposePanelHeight = (purpose: string, charsPerLine: number): number =>
  PP_PURPOSE_PAD + LH11 + 6 + estimateTextLines(purpose, charsPerLine) * CL_PURPOSE_LH + PP_PURPOSE_PAD;
const getPurposeCharsPerLine = (productPartWidth: number): number => {
  const purposePanelWidth = Math.max(240, productPartWidth - 220);
  return Math.max(20, Math.floor((purposePanelWidth - 28) / 7));
};
// Product part header: card padding-top + max(summary, purpose) + transition gap
const getProductPartHeaderHeight = (productPart: Pick<ProductPartEntity, "title" | "purpose">, productPartWidth: number): number =>
  Math.ceil(PP_CARD_PAD_TOP + Math.max(
    getProductPartSummaryHeight(productPart.title),
    getPurposePanelHeight(productPart.purpose, getPurposeCharsPerLine(productPartWidth))
  ) + PRODUCT_PART_HEADER_BODY_GAP);

const buildModuleNode = ({
  module,
  position,
  productPart,
  cluster,
  parentId,
  height,
}: {
  readonly module: ModuleEntity;
  readonly position: { readonly x: number; readonly y: number };
  readonly productPart: string;
  readonly cluster?: string;
  readonly parentId?: string;
  readonly height: number;
}): DiagramFlowNode => ({
  id: module.id,
  type: "module",
  position,
  parentId,
  style: { width: MODULE_CARD_WIDTH, minHeight: height },
  data: {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: module.id,
    title: module.title,
    kind: module.kind,
    responsibility: module.responsibility,
    status: module.status,
    origin: module.origin,
    productPart,
    cluster,
    inputCount: module.inputs.length,
    outputCount: module.outputs.length,
  },
});

const buildFallbackClusters = (
  model: ModuleMapModel
): ReadonlyMap<string, { readonly moduleIds: readonly string[]; readonly title: string }> =>
  new Map(
    [...new Set(model.modules.flatMap((module) => (module.cluster ? [module.cluster] : [])))]
      .sort((left, right) => left.localeCompare(right))
      .map((clusterId) => [clusterId, {
        moduleIds: model.modules.filter((module) => module.cluster === clusterId).map((module) => module.id),
        title: humanizeIdentifier(clusterId),
      }])
  );

const getClusterIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  clustersById: ReadonlyMap<string, ClusterEntity>
): readonly string[] =>
  (productPart.clusterIds.length > 0
    ? productPart.clusterIds
    : [...new Set(model.modules.flatMap((module) =>
        module.cluster && (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id ? [module.cluster] : []
      ))]).filter((clusterId) => clustersById.has(clusterId));

const getStandaloneModuleIds = (
  productPart: ProductPartEntity,
  model: ModuleMapModel,
  modulesById: ReadonlyMap<string, ModuleEntity>
): readonly string[] =>
  (productPart.standaloneModuleIds.length > 0
    ? productPart.standaloneModuleIds
    : model.modules
        .filter((module) => !module.cluster && (module.productPart ?? DEFAULT_PRODUCT_PART_ID) === productPart.id)
        .map((module) => module.id)).filter((moduleId) => modulesById.has(moduleId));

export const buildModuleStageNodes = (model: ModuleMapModel): readonly DiagramFlowNode[] => {
  const modulesById = new Map(model.modules.map((module) => [module.id, module]));
  const fallbackClusters = buildFallbackClusters(model);
  const clustersById = new Map([...(model.clusters ?? [])].sort(compareById).map((cluster) => [cluster.id, cluster] as const));
  for (const [clusterId, cluster] of fallbackClusters.entries()) {
    if (!clustersById.has(clusterId)) {
      clustersById.set(clusterId, { id: clusterId, title: cluster.title, purpose: `Fallback cluster for ${clusterId}`, productPart: DEFAULT_PRODUCT_PART_ID, moduleIds: cluster.moduleIds });
    }
  }

  const productParts = [
    ...(model.productParts ?? [{
      id: DEFAULT_PRODUCT_PART_ID,
      title: humanizeIdentifier(DEFAULT_PRODUCT_PART_ID),
      purpose: "Fallback product part derived in the React Flow adapter",
      clusterIds: [...fallbackClusters.keys()],
      standaloneModuleIds: model.modules.filter((module) => !module.cluster).map((module) => module.id),
    }]),
  ];

  const nodes: DiagramFlowNode[] = [];
  let productPartY = 0;
  for (const productPart of productParts) {
    const clusterIds = getClusterIds(productPart, model, clustersById);
    const standaloneModuleIds = getStandaloneModuleIds(productPart, model, modulesById);
    const externalStandaloneModuleIds = standaloneModuleIds.filter((moduleId) => modulesById.get(moduleId)?.kind === "external");
    const internalStandaloneModuleIds = standaloneModuleIds.filter((moduleId) => !externalStandaloneModuleIds.includes(moduleId));
    const clusterModuleCols = clusterIds.map((id) => getClusterModuleCols(clustersById.get(id)?.moduleIds.length ?? 0));
    const totalClusterSlots = clusterModuleCols.reduce((s, c) => s + c, 0);
    const standaloneColumnCount = Math.max(1, totalClusterSlots, Math.min(PRODUCT_PART_FALLBACK_STANDALONE_COLUMNS, internalStandaloneModuleIds.length));
    const productPartWidth = Math.max(720, PRODUCT_PART_PADDING_X * 2 + Math.max(totalClusterSlots, standaloneColumnCount) * CLUSTER_X_STEP);
    const productPartHeaderHeight = getProductPartHeaderHeight(productPart, productPartWidth);

    const clusterNodes: DiagramFlowNode[] = [];
    const clusteredModuleNodes: DiagramFlowNode[] = [];
    const clusterHeights: number[] = [];
    let clusterXSlot = 0;
    for (const [clusterIndex, clusterId] of clusterIds.entries()) {
      const cluster = clustersById.get(clusterId);
      if (!cluster) {
        continue;
      }
      const cols = clusterModuleCols[clusterIndex] ?? 1;
      const clusterWidth = getClusterInnerWidth(cols);
      const headerHeight = getClusterHeaderHeight(cluster);
      const colNextY = Array.from({ length: cols }, () => headerHeight);
      for (const moduleId of cluster.moduleIds) {
        const module = modulesById.get(moduleId);
        if (!module) {
          continue;
        }
        const height = getModuleCardHeight(module);
        const colIdx = colNextY.indexOf(Math.min(...colNextY));
        clusteredModuleNodes.push(buildModuleNode({
          module,
          position: { x: MODULE_X_OFFSET + colIdx * (MODULE_CARD_WIDTH + MODULE_CARD_GAP), y: colNextY[colIdx] },
          parentId: toClusterNodeId(clusterId),
          productPart: productPart.id,
          cluster: clusterId,
          height,
        }));
        colNextY[colIdx] += height + MODULE_CARD_GAP;
      }
      const maxY = Math.max(headerHeight, ...colNextY);
      const clusterHeight = maxY > headerHeight ? maxY - MODULE_CARD_GAP + CLUSTER_BOTTOM_PADDING : headerHeight + CLUSTER_BOTTOM_PADDING;
      clusterHeights.push(clusterHeight);
      clusterNodes.push({
        id: toClusterNodeId(clusterId),
        type: "cluster",
        position: { x: PRODUCT_PART_PADDING_X + clusterXSlot * CLUSTER_X_STEP, y: productPartHeaderHeight },
        parentId: toProductPartNodeId(productPart.id),
        style: { width: clusterWidth, height: clusterHeight },
        data: {
          stage: "diagram_modules",
          nodeKind: "cluster",
          clusterId,
          productPartId: productPart.id,
          title: cluster.title,
          purpose: cluster.purpose,
          moduleIds: cluster.moduleIds,
          containerConstraints: {
            childMinX: MODULE_X_OFFSET,
            childMinY: headerHeight,
            minWidth: getClusterInnerWidth(1),
            minHeight: headerHeight + CLUSTER_BOTTOM_PADDING,
            paddingRight: CLUSTER_PADDING_X,
            paddingBottom: CLUSTER_BOTTOM_PADDING,
          },
        },
      });
      clusterXSlot += cols;
    }

    const clusterSectionHeight = Math.max(0, ...clusterHeights);
    const standaloneBaseY = productPartHeaderHeight + (clusterIds.length > 0 ? clusterSectionHeight + PRODUCT_PART_SECTION_GAP : 0);
    const standaloneNodes: DiagramFlowNode[] = [];
    const columnNextY = Array.from({ length: standaloneColumnCount }, () => standaloneBaseY);
    const standaloneInitBottom = clusterIds.length > 0 ? productPartHeaderHeight + clusterSectionHeight : productPartHeaderHeight;
    const columnContentBottoms = Array.from({ length: standaloneColumnCount }, () => standaloneInitBottom);
    for (const moduleId of internalStandaloneModuleIds) {
      const module = modulesById.get(moduleId);
      if (!module) {
        continue;
      }
      const columnIndex = columnNextY.indexOf(Math.min(...columnNextY));
      const height = getModuleCardHeight(module);
      const y = columnNextY[columnIndex] ?? productPartHeaderHeight;
      standaloneNodes.push(buildModuleNode({
        module,
        position: { x: PRODUCT_PART_PADDING_X + columnIndex * STANDALONE_X_STEP, y },
        parentId: toProductPartNodeId(productPart.id),
        productPart: productPart.id,
        height,
      }));
      columnContentBottoms[columnIndex] = y + height;
      columnNextY[columnIndex] = y + height + MODULE_CARD_GAP;
    }

    const externalNodes: DiagramFlowNode[] = [];
    let externalSectionHeight = 0;
    for (const [externalIndex, moduleId] of externalStandaloneModuleIds.entries()) {
      const module = modulesById.get(moduleId);
      if (!module) {
        continue;
      }
      const height = getModuleCardHeight(module);
      const offsetY = standaloneBaseY + externalSectionHeight + (externalIndex > 0 ? MODULE_CARD_GAP : 0);
      externalNodes.push(buildModuleNode({
        module,
        position: { x: productPartWidth + PRODUCT_PART_EXTERNAL_GAP, y: productPartY + offsetY },
        productPart: productPart.id,
        height,
      }));
      externalSectionHeight = offsetY + height - standaloneBaseY;
    }

    const productPartHeight = Math.max(
      260,
      Math.max(productPartHeaderHeight, ...columnContentBottoms) + PRODUCT_PART_PADDING_BOTTOM
    );
    nodes.push(
      {
        id: toProductPartNodeId(productPart.id),
        type: "cluster",
        position: { x: 0, y: productPartY },
        style: { width: productPartWidth, height: productPartHeight },
        data: {
          stage: "diagram_modules",
          nodeKind: "productPart",
          productPartId: productPart.id,
          title: productPart.title,
          purpose: productPart.purpose,
          clusterIds,
          standaloneModuleIds,
          containerConstraints: { childMinX: PRODUCT_PART_PADDING_X, childMinY: productPartHeaderHeight, minWidth: 720, minHeight: 260, paddingRight: PRODUCT_PART_PADDING_X, paddingBottom: PRODUCT_PART_PADDING_BOTTOM },
        },
      },
      ...clusterNodes,
      ...clusteredModuleNodes,
      ...standaloneNodes,
      ...externalNodes
    );
    productPartY += Math.max(productPartHeight, standaloneBaseY + externalSectionHeight) + PRODUCT_PART_ROW_GAP;
  }
  return nodes;
};
