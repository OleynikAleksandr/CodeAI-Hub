import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ApplicationSkeletonSubstep } from "./application-skeleton-progress";

export interface ApplicationSkeletonMaterializationValidation {
  readonly observedMaterialization: boolean;
  readonly validationErrors: readonly string[];
}

const STALE_MATERIALIZED_MARKDOWN_PATTERNS = Object.entries({
  "after confirmation": /after confirmation/i,
  "after explicit confirmation":
    /\u043f\u043e\u0441\u043b\u0435\s+\u044f\u0432\u043d\u043e\u0433\u043e\s+\u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u044f/i,
  "after explicit user acceptance": /after explicit user acceptance/i,
  "draft wording": /\u0427\u0435\u0440\u043d\u043e\u0432\u0438\u043a/i,
  "draft-only": /draft-only/i,
  "filesystem materialization is pending":
    /filesystem materialization is pending/i,
  "future creation wording":
    /\u0431\u0443\u0434\u0435\u0442\s+\u0441\u043e\u0437\u0434\u0430/i,
  "not materialized": /not materialized/i,
  "planned but not yet": /planned but not yet/i,
  "will be created": /will be created/i,
}).map(([label, pattern]) => ({ label, pattern }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAcceptedFlag = (value: Record<string, unknown> | null): boolean => {
  const acceptance = value?.acceptance;
  return (
    value?.accepted === true ||
    (isRecord(acceptance) && acceptance.accepted === true)
  );
};

const readMaterializedFlag = (
  value: Record<string, unknown> | null
): boolean => {
  const materialization = value?.materialization;
  return (
    value?.materialized === true ||
    (isRecord(materialization) && materialization.materialized === true)
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

const TRAILING_SLASH_RE = /\/+$/u;

const normalizeMaterializedPaths = (
  paths: readonly string[]
): readonly string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const entry of paths) {
    const trimmed = entry.trim().replace(TRAILING_SLASH_RE, "");
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }
  return normalized;
};

const readSourceRoot = (value: Record<string, unknown> | null): string =>
  typeof value?.sourceRoot === "string" && value.sourceRoot.trim().length > 0
    ? value.sourceRoot.trim()
    : "product-parts";

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

export const extractApplicationSkeletonMaterializedPaths = (
  mapJson: Record<string, unknown> | null
): readonly string[] => {
  if (!mapJson) {
    return [];
  }
  const declared = Array.isArray(mapJson.materializedPaths)
    ? mapJson.materializedPaths.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0
      )
    : [];
  const fromTree = collectCodePaths(mapJson);
  return Array.from(new Set([...declared, ...fromTree]));
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
): Promise<boolean> =>
  (
    await Promise.all(
      relativePaths.map((relativePath) =>
        relativePathExists(workspaceRoot, relativePath)
      )
    )
  ).some(Boolean);

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

const LOCKFILES_BY_PACKAGE_MANAGER: Record<string, readonly string[]> = {
  bun: ["bun.lock", "bun.lockb"],
  npm: ["package-lock.json", "npm-shrinkwrap.json"],
  pnpm: ["pnpm-lock.yaml"],
  yarn: ["yarn.lock"],
};

const toMissingPathErrors = async (
  workspaceRoot: string,
  paths: readonly string[],
  message: string
): Promise<readonly string[]> =>
  (await resolveMissingPaths(workspaceRoot, paths)).map(
    (missingPath) => `${message}: ${missingPath}`
  );

const isNonProductionEntrypoint = (entrypoint: string): boolean =>
  entrypoint.startsWith(".codeai-hub") || entrypoint.startsWith("node_modules");

const validateMaterializedFoundation = async (
  mapJson: Record<string, unknown> | null,
  workspaceRoot: string
): Promise<readonly string[]> => {
  const foundation = isRecord(mapJson?.projectFoundation)
    ? mapJson.projectFoundation
    : null;
  if (!foundation) {
    return ["application skeleton projectFoundation is missing"];
  }
  const errors: string[] = [];
  if (
    !Array.isArray(mapJson?.openQuestions) ||
    mapJson.openQuestions.length > 0
  ) {
    errors.push(
      "application skeleton openQuestions must be empty before materialization"
    );
  }
  if (!(await relativePathExists(workspaceRoot, "package.json"))) {
    errors.push("application skeleton root package.json is missing");
  }
  const packageManager =
    typeof mapJson?.packageManager === "string"
      ? mapJson.packageManager.toLowerCase()
      : "";
  const lockfiles = LOCKFILES_BY_PACKAGE_MANAGER[packageManager] ?? [];
  if (
    lockfiles.length > 0 &&
    !(await anyRelativePathExists(workspaceRoot, lockfiles))
  ) {
    errors.push(
      `application skeleton lockfile is missing for packageManager ${packageManager}`
    );
  }
  errors.push(
    ...(await toMissingPathErrors(
      workspaceRoot,
      readStringArray(foundation, "configFiles"),
      "application skeleton config file is missing"
    ))
  );
  const entrypoints = readStringArray(foundation, "firstWaveEntrypoints");
  errors.push(
    ...entrypoints
      .filter(isNonProductionEntrypoint)
      .map(
        (entrypoint) =>
          `application skeleton first-wave entrypoint must be production path: ${entrypoint}`
      ),
    ...(await toMissingPathErrors(
      workspaceRoot,
      entrypoints.filter(
        (entrypoint) => !isNonProductionEntrypoint(entrypoint)
      ),
      "application skeleton first-wave entrypoint is missing"
    ))
  );
  const rawPackage = await readFile(
    path.join(workspaceRoot, "package.json"),
    "utf8"
  )
    .then((content) => JSON.parse(content) as unknown)
    .catch(() => null);
  const scripts =
    isRecord(rawPackage) && isRecord(rawPackage.scripts)
      ? rawPackage.scripts
      : null;
  errors.push(
    ...readStringArray(foundation, "requiredScripts")
      .filter((script) => !scripts || typeof scripts[script] !== "string")
      .map(
        (script) => `application skeleton required script is missing: ${script}`
      )
  );
  return errors;
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
  const materializedPaths = normalizeMaterializedPaths(
    readStringArray(params.mapJson, "materializedPaths")
  );
  const observedMaterialization =
    readMaterializedFlag(params.mapJson) ||
    readMaterializationState(params.mapJson) === "materializing" ||
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
    ...(await validateMaterializedFoundation(
      params.mapJson,
      params.workspaceRoot
    )),
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
