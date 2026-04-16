const DEFAULT_MAX_CONCURRENT_RUNTIME_BUNDLES = 2;

export const resolveWithBoundedConcurrency = async <
  TCategory extends string,
  TResult,
>(
  categories: readonly TCategory[],
  resolveCategory: (category: TCategory) => Promise<TResult>,
  maxConcurrentJobs = DEFAULT_MAX_CONCURRENT_RUNTIME_BUNDLES
): Promise<Record<TCategory, TResult>> => {
  const resolved = {} as Record<TCategory, TResult>;
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < categories.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const category = categories[currentIndex];
      if (!category) {
        return;
      }
      resolved[category] = await resolveCategory(category);
    }
  };

  const workerCount = Math.max(
    1,
    Math.min(maxConcurrentJobs, categories.length)
  );
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return resolved;
};
