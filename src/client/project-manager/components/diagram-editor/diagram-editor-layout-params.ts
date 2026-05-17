/**
 * Declarative layout parameters for CSS Grid-based diagram layout.
 * These params are stored in sidecar (per-node overrides) and drive
 * CSS Grid column counts instead of pixel-level positioning.
 */

export type ProductPartLayoutColumns = "auto" | 2 | 3 | 4 | 5;
export type TargetAspectRatio = "landscape" | "wide" | "square";
export type ClusterModuleColumns = "auto" | 1 | 2 | 3;

export type ProductPartLayoutParams = {
  readonly columns: ProductPartLayoutColumns;
  readonly targetAspectRatio: TargetAspectRatio;
};

export type ClusterLayoutParams = {
  readonly moduleColumns: ClusterModuleColumns;
};

const ASPECT_RATIOS: Record<TargetAspectRatio, number> = {
  landscape: 4 / 3,
  wide: 16 / 9,
  square: 1,
};

const SINGLE_COL_CLUSTER_WIDTH = 300;
const DOUBLE_COL_CLUSTER_WIDTH = 580;
const STANDALONE_MODULE_WIDTH = 260;
const GRID_GAP = 12;
const MODULE_ROW_BUDGET = 3;
const MODULE_CARD_HEIGHT_ESTIMATE = 200;
const STANDALONE_MODULE_HEIGHT_ESTIMATE = 260;

export type SlotDescriptor =
  | {
      readonly kind: "cluster";
      readonly moduleColumns: ClusterModuleColumns;
      readonly moduleCount: number;
    }
  | { readonly kind: "standaloneModule" };

const resolveModuleColumns = (
  moduleCount: number,
  override: ClusterModuleColumns,
): number => {
  if (override !== "auto") return override;
  return moduleCount > 2 ? 2 : 1;
};

const getSlotWidthWithColumns = (
  slot: SlotDescriptor,
  moduleColumns: number,
): number => {
  if (slot.kind === "standaloneModule") return STANDALONE_MODULE_WIDTH;
  return moduleColumns >= 2 ? DOUBLE_COL_CLUSTER_WIDTH : SINGLE_COL_CLUSTER_WIDTH;
};

const getSlotHeightWithColumns = (
  slot: SlotDescriptor,
  moduleColumns: number,
): number => {
  if (slot.kind === "standaloneModule") {
    return STANDALONE_MODULE_HEIGHT_ESTIMATE;
  }
  const rows = Math.max(1, Math.ceil(slot.moduleCount / moduleColumns));
  return rows * MODULE_CARD_HEIGHT_ESTIMATE;
};

const getMinimumRowFootprint = (slot: SlotDescriptor): number => {
  if (slot.kind === "standaloneModule") return 1;
  return slot.moduleColumns === "auto" ? 1 : slot.moduleColumns;
};

const rowMinimumFootprintFitsBudget = (
  slots: readonly SlotDescriptor[],
  columns: number,
): boolean => {
  for (let rowStart = 0; rowStart < slots.length; rowStart += columns) {
    const row = slots.slice(rowStart, rowStart + columns);
    const rowFootprint = row.reduce(
      (sum, slot) => sum + getMinimumRowFootprint(slot),
      0,
    );
    if (rowFootprint > MODULE_ROW_BUDGET) return false;
  }
  return true;
};

export const resolveRowAwareModuleColumns = (
  slots: readonly SlotDescriptor[],
  productPartColumns: number,
): readonly number[] => {
  const resolved: number[] = [];
  for (let rowStart = 0; rowStart < slots.length; rowStart += productPartColumns) {
    let rowFootprint = 0;
    const rowEnd = Math.min(rowStart + productPartColumns, slots.length);

    for (let index = rowStart; index < rowEnd; index++) {
      const slot = slots[index]!;
      if (slot.kind === "standaloneModule") {
        resolved[index] = 1;
        rowFootprint += 1;
        continue;
      }

      const baseColumns = resolveModuleColumns(
        slot.moduleCount,
        slot.moduleColumns,
      );
      if (slot.moduleColumns !== "auto") {
        resolved[index] = baseColumns;
        rowFootprint += baseColumns;
        continue;
      }

      const remainingBudget = Math.max(1, MODULE_ROW_BUDGET - rowFootprint);
      const autoColumns = Math.min(baseColumns, remainingBudget);
      resolved[index] = autoColumns;
      rowFootprint += autoColumns;
    }
  }

  return resolved;
};

/**
 * Resolve the number of CSS Grid columns for a ProductPart body.
 * When `columns` is "auto", tries 2..5 and picks the one whose
 * resulting aspect ratio is closest to the target while keeping automatic
 * rows within the module-card budget.
 */
export const resolveProductPartColumns = (
  slots: readonly SlotDescriptor[],
  params: ProductPartLayoutParams,
): number => {
  if (params.columns !== "auto") return params.columns;
  if (slots.length <= 1) return 1;

  const targetRatio = ASPECT_RATIOS[params.targetAspectRatio];
  let bestCols = 2;
  let bestDistance = Number.POSITIVE_INFINITY;

  const maxCols = Math.min(5, slots.length);
  for (let n = 2; n <= maxCols; n++) {
    if (!rowMinimumFootprintFitsBudget(slots, n)) continue;
    const columnHeights = new Array<number>(n).fill(0);
    const columnWidths = new Array<number>(n).fill(0);
    const rowAwareColumns = resolveRowAwareModuleColumns(slots, n);

    for (const [i, slot] of slots.entries()) {
      const col = i % n;
      const moduleColumns = rowAwareColumns[i] ?? 1;
      const w = getSlotWidthWithColumns(slot, moduleColumns);
      columnWidths[col] = Math.max(columnWidths[col]!, w);
      columnHeights[col]! += getSlotHeightWithColumns(slot, moduleColumns);
    }

    const totalWidth = columnWidths.reduce((a, b) => a + b, 0) + GRID_GAP * (n - 1);
    const maxHeight = Math.max(...columnHeights);
    const ratio = maxHeight > 0 ? totalWidth / maxHeight : 1;
    const distance = Math.abs(ratio - targetRatio);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestCols = n;
    }
  }

  return bestCols;
};

/**
 * Resolve the number of CSS Grid columns for modules inside a Cluster.
 */
export const resolveClusterModuleColumns = (
  moduleCount: number,
  params: ClusterLayoutParams,
): number => resolveModuleColumns(moduleCount, params.moduleColumns);

export const defaultProductPartLayout = (): ProductPartLayoutParams => ({
  columns: "auto",
  targetAspectRatio: "landscape",
});

export const defaultClusterLayout = (): ClusterLayoutParams => ({
  moduleColumns: "auto",
});
