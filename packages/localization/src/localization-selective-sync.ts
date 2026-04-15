import type { LocalizationCategoryId } from "./localization-contract";

export interface LocalizationSelectiveSyncOptions {
  readonly affectedRuntimeBundleIds: readonly LocalizationCategoryId[];
}

export const resolveAffectedBundleSet = (
  options?: LocalizationSelectiveSyncOptions
): ReadonlySet<LocalizationCategoryId> | null => {
  if (!options?.affectedRuntimeBundleIds) {
    return null;
  }
  return new Set(options.affectedRuntimeBundleIds);
};

export const shouldStrictRebuildBundle = (
  category: LocalizationCategoryId,
  affectedBundleSet: ReadonlySet<LocalizationCategoryId> | null
): boolean => {
  if (!affectedBundleSet) {
    return true;
  }
  return affectedBundleSet.has(category);
};
