import { stat } from "node:fs/promises";
import path from "node:path";
import type { ApplicationSkeletonSubstep } from "./application-skeleton-progress";

export interface ApplicationSkeletonMaterializationValidation {
  readonly observedMaterialization: boolean;
  readonly validationErrors: readonly string[];
}

const STALE_MATERIALIZED_MARKDOWN_PATTERNS: readonly {
  readonly label: string;
  readonly pattern: RegExp;
}[] = [
  { label: "draft-only", pattern: /draft-only/i },
  { label: "not materialized", pattern: /not materialized/i },
  { label: "will be created", pattern: /will be created/i },
  { label: "planned but not yet", pattern: /planned but not yet/i },
  { label: "after confirmation", pattern: /after confirmation/i },
  {
    label: "after explicit user acceptance",
    pattern: /after explicit user acceptance/i,
  },
  {
    label: "filesystem materialization is pending",
    pattern: /filesystem materialization is pending/i,
  },
  {
    label: "draft wording",
    pattern: /\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a/i,
  },
  {
    label: "after explicit confirmation",
    pattern:
      /\u043f\u043e\u0441\u043b\u0435\s+\u044f\u0432\u043d\u043e\u0433\u043e\s+\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f/i,
  },
  {
    label: "future creation wording",
    pattern: /\u0431\u0443\u0434\u0435\u0442\s+\u0441\u043e\u0437\u0434\u0430/i,
  },
];

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  if (!value) {
    return false;
  }
  if (value.accepted === true) {
    return true;
  }
  const acceptance = value.acceptance;
  return (
    typeof acceptance === "object" &&
    acceptance !== null &&
    !Array.isArray(acceptance) &&
    (acceptance as Record<string, unknown>).accepted === true
  );
};

const readMaterializedFlag = (
  value: Record<string, unknown> | null
): boolean => {
  if (!value) {
    return false;
  }
  if (value.materialized === true) {
    return true;
  }
  const materialization = value.materialization;
  return (
    typeof materialization === "object" &&
    materialization !== null &&
    !Array.isArray(materialization) &&
    (materialization as Record<string, unknown>).materialized === true
  );
};

const readMaterializationState = (
  value: Record<string, unknown> | null
): ApplicationSkeletonSubstep => {
  let raw: unknown = null;
  if (typeof value?.materializationState === "string") {
    raw = value.materializationState;
  } else if (typeof value?.status === "string") {
    raw = value.status;
  }
  if (
    raw === "materializing" ||
    raw === "in_progress" ||
    raw === "materialized" ||
    raw === "failed" ||
    raw === "outdated"
  ) {
    return raw === "in_progress" ? "materializing" : raw;
  }
  return "artifact";
};

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] => {
  const raw = value?.[key];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === "string")
    : [];
};

const readSourceRoot = (value: Record<string, unknown> | null): string =>
  typeof value?.sourceRoot === "string" && value.sourceRoot.trim().length > 0
    ? value.sourceRoot.trim()
    : "product-parts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const collectCodePaths = (
  value: Record<string, unknown> | null
): readonly string[] => {
  if (!Array.isArray(value?.productParts)) {
    return [];
  }
  return value.productParts.flatMap((part) =>
    isRecord(part) ? collectCodePathsFromNode(part) : []
  );
};

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

const validateModuleIdentifiers = (
  modules: readonly unknown[],
  parentLabel: string
): readonly string[] =>
  modules.flatMap((module, moduleIndex) => {
    if (!isRecord(module) || hasCanonicalId(module, "moduleId")) {
      return [];
    }
    return [
      `application skeleton Module is missing moduleId: ${describeMappedNode(
        module,
        `${parentLabel}.modules[${moduleIndex}]`
      )}`,
    ];
  });

const validateIdentifierFields = (
  value: Record<string, unknown> | null
): readonly string[] => {
  if (!Array.isArray(value?.productParts)) {
    return [];
  }
  const errors: string[] = [];
  value.productParts.forEach((part, partIndex) => {
    if (!isRecord(part)) {
      return;
    }
    const partLabel = describeMappedNode(part, `productParts[${partIndex}]`);
    if (!hasCanonicalId(part, "partId")) {
      errors.push(
        `application skeleton Product Part is missing partId: ${partLabel}`
      );
    }
    if (Array.isArray(part.clusters)) {
      part.clusters.forEach((cluster, clusterIndex) => {
        if (!isRecord(cluster)) {
          return;
        }
        const clusterLabel = describeMappedNode(
          cluster,
          `${partLabel}.clusters[${clusterIndex}]`
        );
        if (!hasCanonicalId(cluster, "clusterId")) {
          errors.push(
            `application skeleton Cluster is missing clusterId: ${clusterLabel}`
          );
        }
        if (Array.isArray(cluster.modules)) {
          errors.push(
            ...validateModuleIdentifiers(cluster.modules, clusterLabel)
          );
        }
      });
    }
    if (Array.isArray(part.standaloneModules)) {
      errors.push(
        ...validateModuleIdentifiers(part.standaloneModules, partLabel)
      );
    }
  });
  return errors;
};

const relativePathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> => {
  const trimmed = relativePath.trim();
  if (!trimmed || path.isAbsolute(trimmed)) {
    return false;
  }
  return Boolean(
    await stat(path.join(workspaceRoot, trimmed)).catch(() => null)
  );
};

const anyRelativePathExists = async (
  workspaceRoot: string,
  relativePaths: readonly string[]
): Promise<boolean> => {
  for (const relativePath of relativePaths) {
    if (await relativePathExists(workspaceRoot, relativePath)) {
      return true;
    }
  }
  return false;
};

const resolveMissingPaths = async (
  workspaceRoot: string,
  relativePaths: readonly string[]
): Promise<readonly string[]> => {
  const missing: string[] = [];
  for (const relativePath of relativePaths) {
    if (!(await relativePathExists(workspaceRoot, relativePath))) {
      missing.push(relativePath);
    }
  }
  return missing;
};

const hasMarkdownStatus = (
  markdown: string,
  field: string,
  value: string
): boolean =>
  new RegExp(`(?:\`${field}\`|${field})\\s*:\\s*\`?${value}\`?`, "i").test(
    markdown
  ) ||
  new RegExp(`\\|\\s*\`?${field}\`?\\s*\\|\\s*\`?${value}\`?\\s*\\|`, "i").test(
    markdown
  );

const hasMarkdownStatusField = (markdown: string, field: string): boolean =>
  new RegExp(`(?:\`${field}\`|${field})\\s*:`, "i").test(markdown) ||
  new RegExp(`\\|\\s*\`?${field}\`?\\s*\\|`, "i").test(markdown);

const validateMaterializedMarkdown = (markdown: string | null): string[] => {
  if (!markdown) {
    return ["application-skeleton.md is missing"];
  }
  const errors: string[] = [];
  for (const [field, value] of [
    ["reviewState", "materialized"],
    ["accepted", "true"],
    ["materialized", "true"],
    ["materializationState", "materialized"],
  ] as const) {
    if (
      hasMarkdownStatusField(markdown, field) &&
      !hasMarkdownStatus(markdown, field, value)
    ) {
      errors.push(`application-skeleton.md status ${field} must be ${value}`);
    }
  }
  for (const stale of STALE_MATERIALIZED_MARKDOWN_PATTERNS) {
    if (stale.pattern.test(markdown)) {
      errors.push(
        `application-skeleton.md contains stale materialization wording: ${stale.label}`
      );
    }
  }
  return errors;
};

export const validateApplicationSkeletonMaterialization = async (params: {
  readonly mapJson: Record<string, unknown> | null;
  readonly markdown: string | null;
  readonly workspaceRoot: string;
}): Promise<ApplicationSkeletonMaterializationValidation> => {
  const sourceRoot = readSourceRoot(params.mapJson);
  const codePaths = collectCodePaths(params.mapJson);
  const materializedPaths = readStringArray(
    params.mapJson,
    "materializedPaths"
  );
  const observedMaterialization =
    readMaterializedFlag(params.mapJson) ||
    readMaterializationState(params.mapJson) === "materialized" ||
    materializedPaths.length > 0 ||
    (await relativePathExists(params.workspaceRoot, sourceRoot)) ||
    (await anyRelativePathExists(params.workspaceRoot, codePaths));
  if (!observedMaterialization) {
    return { observedMaterialization, validationErrors: [] };
  }
  const validationErrors = [
    ...validateMapLifecycle({ mapJson: params.mapJson, sourceRoot }),
    ...validateIdentifierFields(params.mapJson),
    ...(await validateDeclaredPaths({
      codePaths,
      materializedPaths,
      workspaceRoot: params.workspaceRoot,
    })),
    ...validateMaterializedMarkdown(params.markdown),
  ];
  return { observedMaterialization, validationErrors };
};

const validateMapLifecycle = (params: {
  readonly mapJson: Record<string, unknown> | null;
  readonly sourceRoot: string;
}): readonly string[] => {
  const errors: string[] = [];
  if (params.mapJson?.reviewState !== "materialized") {
    errors.push(
      "application-skeleton-map.json reviewState must be materialized"
    );
  }
  if (!readAcceptedFlag(params.mapJson)) {
    errors.push("application-skeleton-map.json accepted must be true");
  }
  if (!readMaterializedFlag(params.mapJson)) {
    errors.push("application-skeleton-map.json materialized must be true");
  }
  if (readMaterializationState(params.mapJson) !== "materialized") {
    errors.push(
      "application-skeleton-map.json materializationState must be materialized"
    );
  }
  if (params.sourceRoot.startsWith(".codeai-hub")) {
    errors.push(
      "application skeleton sourceRoot must not point into .codeai-hub"
    );
  }
  return errors;
};

const validateDeclaredPaths = async (params: {
  readonly codePaths: readonly string[];
  readonly materializedPaths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const errors: string[] = [];
  for (const codePath of params.codePaths) {
    if (codePath.startsWith(".codeai-hub")) {
      errors.push(
        `application skeleton codePath must be production path: ${codePath}`
      );
    }
  }
  const missingCodePaths = await resolveMissingPaths(
    params.workspaceRoot,
    params.codePaths
  );
  for (const missingPath of missingCodePaths) {
    errors.push(`application skeleton codePath is missing: ${missingPath}`);
  }
  const missingMaterializedPaths = await resolveMissingPaths(
    params.workspaceRoot,
    params.materializedPaths
  );
  for (const missingPath of missingMaterializedPaths) {
    errors.push(
      `application skeleton materializedPath is missing: ${missingPath}`
    );
  }
  return errors;
};
