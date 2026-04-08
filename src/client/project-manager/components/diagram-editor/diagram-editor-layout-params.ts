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

export type SlotDescriptor =
  | { readonly kind: "cluster"; readonly moduleCount: number; readonly moduleColumns: ClusterModuleColumns }
  | { readonly kind: "standaloneModule" };

const resolveModuleColumns = (
  moduleCount: number,
  override: ClusterModuleColumns,
): number => {
  if (override !== "auto") return override;
  return moduleCount > 2 ? 2 : 1;
};

const getSlotWidth = (slot: SlotDescriptor): number => {
  if (slot.kind === "standaloneModule") return STANDALONE_MODULE_WIDTH;
  const cols = resolveModuleColumns(slot.moduleCount, slot.moduleColumns);
  return cols >= 2 ? DOUBLE_COL_CLUSTER_WIDTH : SINGLE_COL_CLUSTER_WIDTH;
};

/**
 * Resolve the number of CSS Grid columns for a ProductPart body.
 * When `columns` is "auto", tries 2..5 and picks the one whose
 * resulting aspect ratio is closest to the target.
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
    const columnHeights = new Array<number>(n).fill(0);
    const columnWidths = new Array<number>(n).fill(0);

    for (const [i, slot] of slots.entries()) {
      const col = i % n;
      const w = getSlotWidth(slot);
      columnWidths[col] = Math.max(columnWidths[col]!, w);
      // Rough height estimate: wider slots are shorter, narrower are taller.
      // Use inverse-width heuristic since we don't know DOM heights yet.
      columnHeights[col]! += w > 400 ? 200 : 300;
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
