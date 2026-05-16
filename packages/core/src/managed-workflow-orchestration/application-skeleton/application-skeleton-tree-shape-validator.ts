const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const describeMappedNode = (
  node: Record<string, unknown>,
  fallback: string
): string =>
  typeof node.codePath === "string" && node.codePath.trim().length > 0
    ? node.codePath.trim()
    : fallback;

const hasCanonicalId = (
  node: Record<string, unknown>,
  legacyKey: string
): boolean =>
  (typeof node.id === "string" && node.id.trim().length > 0) ||
  (typeof node[legacyKey] === "string" && node[legacyKey].trim().length > 0);

const readKind = (node: Record<string, unknown>): string =>
  typeof node.kind === "string" ? node.kind.trim().toLowerCase() : "";

const collectCodePathsFromNode = (node: Record<string, unknown>): string[] => {
  const paths: string[] = [];
  if (typeof node.codePath === "string") {
    paths.push(node.codePath);
  }
  for (const key of ["clusters", "modules", "standaloneModules"]) {
    const children = node[key];
    if (!Array.isArray(children)) {
      continue;
    }
    for (const child of children) {
      if (isRecord(child)) {
        paths.push(...collectCodePathsFromNode(child));
      }
    }
  }
  return paths;
};

const validateModule = (module: unknown, label: string): readonly string[] => {
  if (!isRecord(module)) {
    return [`application skeleton Module entry must be an object: ${label}`];
  }
  const errors: string[] = [];
  if (!hasCanonicalId(module, "moduleId")) {
    errors.push(
      `application skeleton Module is missing moduleId: ${describeMappedNode(
        module,
        label
      )}`
    );
  }
  for (const key of ["clusters", "modules", "standaloneModules"]) {
    if (Array.isArray(module[key])) {
      errors.push(
        `application skeleton Module must not own ${key}: ${describeMappedNode(
          module,
          label
        )}`
      );
    }
  }
  return errors;
};

const validateCluster = (
  cluster: unknown,
  label: string
): readonly string[] => {
  if (!isRecord(cluster)) {
    return [`application skeleton Cluster entry must be an object: ${label}`];
  }
  const errors: string[] = [];
  if (readKind(cluster) === "module" || "moduleId" in cluster) {
    errors.push(
      `application skeleton Module must be nested under a Cluster modules array: ${describeMappedNode(
        cluster,
        label
      )}`
    );
  }
  if (!hasCanonicalId(cluster, "clusterId")) {
    errors.push(
      `application skeleton Cluster is missing clusterId: ${describeMappedNode(
        cluster,
        label
      )}`
    );
  }
  if (Array.isArray(cluster.standaloneModules)) {
    errors.push(
      `application skeleton Cluster must not own standaloneModules: ${describeMappedNode(
        cluster,
        label
      )}`
    );
  }
  if (Array.isArray(cluster.modules)) {
    cluster.modules.forEach((module, moduleIndex) => {
      errors.push(
        ...validateModule(module, `${label}.modules[${moduleIndex}]`)
      );
    });
  }
  return errors;
};

const validateProductPart = (
  part: unknown,
  index: number
): readonly string[] => {
  const label = `productParts[${index}]`;
  if (!isRecord(part)) {
    return [
      `application skeleton Product Part entry must be an object: ${label}`,
    ];
  }
  const errors: string[] = [];
  const partLabel = describeMappedNode(part, label);
  if (
    readKind(part) === "cluster" ||
    "clusterId" in part ||
    partLabel.includes("/clusters/")
  ) {
    errors.push(
      `application skeleton Cluster must be nested under its Product Part: ${partLabel}`
    );
  }
  if (
    readKind(part) === "module" ||
    "moduleId" in part ||
    partLabel.includes("/modules/")
  ) {
    errors.push(
      `application skeleton Module must be nested under its Product Part tree: ${partLabel}`
    );
  }
  if (!hasCanonicalId(part, "partId")) {
    errors.push(
      `application skeleton Product Part is missing partId: ${partLabel}`
    );
  }
  if (Array.isArray(part.modules)) {
    errors.push(
      `application skeleton Product Part must use standaloneModules instead of modules: ${partLabel}`
    );
  }
  if (Array.isArray(part.clusters)) {
    part.clusters.forEach((cluster, clusterIndex) => {
      errors.push(
        ...validateCluster(cluster, `${partLabel}.clusters[${clusterIndex}]`)
      );
    });
  }
  if (Array.isArray(part.standaloneModules)) {
    part.standaloneModules.forEach((module, moduleIndex) => {
      errors.push(
        ...validateModule(
          module,
          `${partLabel}.standaloneModules[${moduleIndex}]`
        )
      );
    });
  }
  return errors;
};

export const collectApplicationSkeletonCodePaths = (
  value: Record<string, unknown> | null
): readonly string[] =>
  Array.isArray(value?.productParts)
    ? value.productParts.flatMap((part) =>
        isRecord(part) ? collectCodePathsFromNode(part) : []
      )
    : [];

export const validateApplicationSkeletonProductTree = (
  value: Record<string, unknown> | null
): readonly string[] =>
  Array.isArray(value?.productParts)
    ? value.productParts.flatMap(validateProductPart)
    : [];
