import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  collectApplicationSkeletonCodePaths,
  validateApplicationSkeletonProductTree,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-tree-shape-validator";
import { validateGeneratedOutputMaterializedPaths } from "./application-skeleton-output-hygiene";
import type { ApplicationSkeletonSubstep } from "./application-skeleton-progress";

export interface ApplicationSkeletonMaterializationValidation {
  readonly observedMaterialization: boolean;
  readonly validationErrors: readonly string[];
}

const APPLICATION_SKELETON_TITLE_RE = /^#\s+Application Skeleton\b/imu;

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
  const fromTree = collectApplicationSkeletonCodePaths(mapJson);
  return Array.from(new Set([...declared, ...fromTree]));
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

const validateMaterializedMarkdown = (markdown: string | null): string[] => {
  if (!markdown) {
    return ["application-skeleton.md is missing"];
  }
  const errors: string[] = [];
  if (!APPLICATION_SKELETON_TITLE_RE.test(markdown)) {
    errors.push(
      "application-skeleton.md is missing '# Application Skeleton' heading"
    );
  }
  return errors;
};

export const validateApplicationSkeletonMaterialization = async (params: {
  readonly mapJson: Record<string, unknown> | null;
  readonly markdown: string | null;
  readonly workspaceRoot: string;
}): Promise<ApplicationSkeletonMaterializationValidation> => {
  const sourceRoot = readSourceRoot(params.mapJson);
  const codePaths = collectApplicationSkeletonCodePaths(params.mapJson);
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
    ...validateApplicationSkeletonProductTree(params.mapJson),
    ...validateGeneratedOutputMaterializedPaths(materializedPaths),
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
