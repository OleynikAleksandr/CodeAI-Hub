import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./application-skeleton-foundation-contract";
import {
  buildDeclaredConfigFile,
  buildEntrypoint,
  buildPackageLock,
  buildProductPartPackageJson,
  buildProductPartTsconfig,
  buildReadme,
  buildRootBaseTsconfig,
  buildRootPackageJson,
  buildRootWorkspaceTsconfig,
  shouldMaterializeNpmProductPart,
} from "./application-skeleton-materializer-content";

const DEFAULT_REQUIRED_SCRIPTS = ["build", "typecheck", "test:smoke"] as const;
const MAP_FILE_NAME = "application-skeleton-map.json";
const MARKDOWN_FILE_NAME = "application-skeleton.md";
const TRAILING_SLASH_RE = /\/+$/u;
const UNSAFE_SEGMENT_RE = /(^|\/)\.\.(\/|$)/u;

export interface ApplicationSkeletonCoreMaterializerResult {
  readonly materializedPaths: readonly string[];
}

interface TreeNode {
  readonly codePath: string;
  readonly id: string;
  readonly kind: "cluster" | "module" | "product-part";
}

const normalizePath = (value: string): string =>
  value.trim().replace(/\\/g, "/").replace(TRAILING_SLASH_RE, "");

const isSafeRelativePath = (value: string): boolean => {
  const normalized = normalizePath(value);
  return (
    normalized.length > 0 &&
    !path.isAbsolute(normalized) &&
    !UNSAFE_SEGMENT_RE.test(normalized) &&
    !normalized.startsWith("node_modules")
  );
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

const unique = (values: readonly string[]): readonly string[] =>
  Array.from(new Set(values.map(normalizePath).filter(isSafeRelativePath)));

const slugFromPath = (codePath: string): string => {
  const fallback = normalizePath(codePath).split("/").filter(Boolean).at(-1);
  return fallback?.replace(/[^a-z0-9-]/giu, "-").toLowerCase() || "module";
};

const readNodeId = (
  node: Record<string, unknown>,
  codePath: string
): string => {
  for (const key of ["id", "partId", "moduleId", "clusterId"]) {
    if (typeof node[key] === "string" && node[key].trim()) {
      return node[key].trim();
    }
  }
  return slugFromPath(codePath);
};

const collectTreeNodes = (
  node: Record<string, unknown>,
  kind: TreeNode["kind"]
): readonly TreeNode[] => {
  const codePath =
    typeof node.codePath === "string" ? normalizePath(node.codePath) : "";
  const current =
    codePath && isSafeRelativePath(codePath)
      ? [{ codePath, id: readNodeId(node, codePath), kind }]
      : [];
  const children: TreeNode[] = [];
  for (const childKey of ["clusters", "modules", "standaloneModules"]) {
    const rawChildren = node[childKey];
    const childKind: TreeNode["kind"] =
      childKey === "clusters" ? "cluster" : "module";
    for (const child of Array.isArray(rawChildren) ? rawChildren : []) {
      if (isRecord(child)) {
        children.push(...collectTreeNodes(child, childKind));
      }
    }
  }
  return [...current, ...children];
};

const collectAllNodes = (
  mapJson: Record<string, unknown>
): readonly TreeNode[] =>
  Array.isArray(mapJson.productParts)
    ? mapJson.productParts.flatMap((part) =>
        isRecord(part) ? collectTreeNodes(part, "product-part") : []
      )
    : [];

const collectProductPartNodes = (
  mapJson: Record<string, unknown>
): readonly TreeNode[] =>
  Array.isArray(mapJson.productParts)
    ? mapJson.productParts.flatMap((part) => {
        if (!isRecord(part) || typeof part.codePath !== "string") {
          return [];
        }
        const codePath = normalizePath(part.codePath);
        return isSafeRelativePath(codePath)
          ? [{ codePath, id: readNodeId(part, codePath), kind: "product-part" }]
          : [];
      })
    : [];

const ROOT_CONFIG_FILES = [
  ".gitignore",
  ".npmrc",
  "package-lock.json",
  "package.json",
  "tsconfig.json",
  "tsconfig.base.json",
] as const;

const buildMarkdown = (params: {
  readonly materializedPaths: readonly string[];
  readonly productParts: readonly TreeNode[];
}): string =>
  [
    "# Application Skeleton",
    "",
    "## Overview",
    "",
    "Application Skeleton принят пользователем и материализован Core-owned scaffold materializer.",
    "",
    "## Status",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| accepted | `true` |",
    "| materialized | `true` |",
    "| reviewState | `materialized` |",
    "| materializationState | `materialized` |",
    "",
    "- `accepted`: `true`",
    "- `materialized`: `true`",
    "- `reviewState`: `materialized`",
    "- `materializationState`: `materialized`",
    "",
    "## Architecture",
    "",
    "Core создал npm workspace foundation и сохранил Product Part / Cluster / Module hierarchy из принятого Development Tree.",
    "",
    "## Stack",
    "",
    "Первичный bootstrap выполняется через `npm install --include=dev`; `.npmrc` закрепляет `include=dev`, чтобы build tools устанавливались независимо от окружения процесса.",
    "",
    "## Product Parts",
    "",
    ...params.productParts.map(
      (node) => `- \`${node.id}\` → \`${node.codePath}\``
    ),
    "",
    "## Filesystem",
    "",
    ...params.materializedPaths.map((entry) => `- \`${entry}\``),
    "",
    "## Materialization",
    "",
    "Production scaffold, package metadata, lockfile seed, TypeScript configs, README placeholders, and first-wave entrypoints are present on disk. Runtime outputs such as `node_modules` and `dist` are ignored and are not listed as materialized paths.",
    "",
    "## Assumptions",
    "",
    "Core owns deterministic scaffold mechanics. Provider agents own stack discussion and contract revisions only.",
    "",
  ].join("\n");

const buildFailedMarkdown = (params: {
  readonly diagnostics: readonly string[];
  readonly materializedPaths: readonly string[];
  readonly productParts: readonly TreeNode[];
}): string =>
  [
    "# Application Skeleton",
    "",
    "## Overview",
    "",
    "Application Skeleton принят пользователем, но Core-owned scaffold materializer не прошел post-materialization validation.",
    "",
    "## Status",
    "",
    "| Field | Value |",
    "| --- | --- |",
    "| accepted | `true` |",
    "| materialized | `false` |",
    "| reviewState | `accepted` |",
    "| materializationState | `failed` |",
    "",
    "- `accepted`: `true`",
    "- `materialized`: `false`",
    "- `reviewState`: `accepted`",
    "- `materializationState`: `failed`",
    "",
    "## Architecture",
    "",
    "Core сохраняет принятый Development Tree и блокирует пользовательский handoff до успешной repair/materialization validation.",
    "",
    "## Stack",
    "",
    "Bootstrap остается Core-owned; provider repair-turn должен исправлять только контракт, если diagnostics указывают на неоднозначность контракта.",
    "",
    "## Product Parts",
    "",
    ...params.productParts.map(
      (node) => `- \`${node.id}\` → \`${node.codePath}\``
    ),
    "",
    "## Filesystem",
    "",
    ...params.materializedPaths.map((entry) => `- \`${entry}\``),
    "",
    "## Materialization",
    "",
    "Материализация остановлена в failed-state. Пользовательский review gate не открыт.",
    "",
    "## Assumptions",
    "",
    ...params.diagnostics.map((diagnostic) => `- ${diagnostic}`),
    "",
  ].join("\n");

export class ApplicationSkeletonCoreMaterializer {
  async materialize(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ApplicationSkeletonCoreMaterializerResult> {
    const artifactRoot = `.codeai-hub/${params.workspaceSlug}/application_skeleton`;
    const mapPath = `${artifactRoot}/${MAP_FILE_NAME}`;
    const markdownPath = `${artifactRoot}/${MARKDOWN_FILE_NAME}`;
    const mapJson = JSON.parse(
      await readFile(path.join(params.workspaceRoot, mapPath), "utf8")
    ) as Record<string, unknown>;
    const packageManager =
      typeof mapJson.packageManager === "string"
        ? mapJson.packageManager.toLowerCase()
        : "npm";
    const productParts = collectProductPartNodes(mapJson);
    const allNodes = collectAllNodes(mapJson);
    const foundation = isRecord(mapJson.projectFoundation)
      ? mapJson.projectFoundation
      : {};
    const declaredConfigFiles = unique(
      readStringArray(foundation, "configFiles")
    );
    const firstWaveEntrypoints = unique(
      readStringArray(foundation, "firstWaveEntrypoints")
    );
    const npmProductParts = productParts.filter((node) =>
      shouldMaterializeNpmProductPart({
        configFiles: declaredConfigFiles,
        entrypoints: firstWaveEntrypoints,
        node,
      })
    );
    const npmProductPartConfigFiles = unique(
      npmProductParts.flatMap((node) => [
        `${node.codePath}/package.json`,
        `${node.codePath}/tsconfig.json`,
      ])
    );
    const npmProductPartEntrypoints = unique(
      npmProductParts.map((node) => `${node.codePath}/src/index.ts`)
    );
    const configFiles = unique([
      ...declaredConfigFiles,
      ...ROOT_CONFIG_FILES,
      ...npmProductPartConfigFiles,
    ]);
    const basePaths = unique([
      ...ROOT_CONFIG_FILES,
      ...allNodes.flatMap((node) => [
        node.codePath,
        `${node.codePath}/README.md`,
      ]),
      ...configFiles,
      ...npmProductPartEntrypoints,
      ...firstWaveEntrypoints,
    ]);
    await this.writeRootFiles(
      params.workspaceRoot,
      packageManager,
      npmProductParts
    );
    await Promise.all(
      npmProductParts.map((node) =>
        this.writeProductPartFiles(params.workspaceRoot, node)
      )
    );
    await this.writeDeclaredConfigFiles({
      configFiles: declaredConfigFiles,
      handledConfigFiles: unique([
        ...ROOT_CONFIG_FILES,
        ...npmProductPartConfigFiles,
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    await Promise.all(
      allNodes.map((node) =>
        this.writeFile(
          params.workspaceRoot,
          `${node.codePath}/README.md`,
          buildReadme({ id: node.id, kind: node.kind })
        )
      )
    );
    await Promise.all(
      firstWaveEntrypoints.map((entrypoint) =>
        this.writeFile(
          params.workspaceRoot,
          entrypoint,
          buildEntrypoint(entrypoint)
        )
      )
    );
    const nextFoundation = {
      ...foundation,
      configFiles,
      firstWaveEntrypoints,
      installCommand:
        packageManager === "npm"
          ? "npm install --include=dev"
          : `${packageManager} install`,
      requiredScripts: unique([
        ...readStringArray(foundation, "requiredScripts"),
        ...DEFAULT_REQUIRED_SCRIPTS,
      ]),
    };
    const materializedMap = {
      ...mapJson,
      accepted: true,
      materializationState: "materialized",
      materialized: true,
      materializedPaths: basePaths,
      openQuestions: [],
      projectFoundation: nextFoundation,
      reviewState: "materialized",
    };
    await this.writeFile(
      params.workspaceRoot,
      mapPath,
      `${JSON.stringify(materializedMap, null, 2)}\n`
    );
    await this.writeFile(
      params.workspaceRoot,
      markdownPath,
      buildMarkdown({ materializedPaths: basePaths, productParts })
    );
    return { materializedPaths: basePaths };
  }

  async markMaterializationFailed(params: {
    readonly diagnostics: readonly string[];
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<Record<string, unknown>> {
    const artifactRoot = `.codeai-hub/${params.workspaceSlug}/application_skeleton`;
    const mapPath = `${artifactRoot}/${MAP_FILE_NAME}`;
    const markdownPath = `${artifactRoot}/${MARKDOWN_FILE_NAME}`;
    const mapJson = JSON.parse(
      await readFile(path.join(params.workspaceRoot, mapPath), "utf8")
    ) as Record<string, unknown>;
    const materializedPaths = readStringArray(mapJson, "materializedPaths");
    const failedMap = {
      ...mapJson,
      accepted: true,
      materializationDiagnostics: [...params.diagnostics],
      materializationState: "failed",
      materialized: false,
      reviewState: "accepted",
    };
    await this.writeFile(
      params.workspaceRoot,
      mapPath,
      `${JSON.stringify(failedMap, null, 2)}\n`
    );
    await this.writeFile(
      params.workspaceRoot,
      markdownPath,
      buildFailedMarkdown({
        diagnostics: params.diagnostics,
        materializedPaths,
        productParts: collectProductPartNodes(failedMap),
      })
    );
    return failedMap;
  }

  private async writeDeclaredConfigFiles(params: {
    readonly configFiles: readonly string[];
    readonly handledConfigFiles: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<void> {
    const handled = new Set(params.handledConfigFiles);
    await Promise.all(
      params.configFiles
        .filter((configFile) => !handled.has(configFile))
        .map((configFile) =>
          this.writeFile(
            params.workspaceRoot,
            configFile,
            buildDeclaredConfigFile(configFile)
          )
        )
    );
  }

  private async writeRootFiles(
    workspaceRoot: string,
    packageManager: string,
    productParts: readonly TreeNode[]
  ): Promise<void> {
    await Promise.all([
      this.writeFile(
        workspaceRoot,
        ".gitignore",
        "node_modules/\ndist/\n.codeai-hub/state/\n.codeai-hub/*/runtime/\n.DS_Store\n"
      ),
      this.writeFile(workspaceRoot, ".npmrc", "include=dev\n"),
      this.writeFile(
        workspaceRoot,
        "package.json",
        buildRootPackageJson(packageManager, productParts)
      ),
      this.writeFile(
        workspaceRoot,
        "package-lock.json",
        buildPackageLock(productParts)
      ),
      this.writeFile(
        workspaceRoot,
        "tsconfig.json",
        buildRootWorkspaceTsconfig(productParts)
      ),
      this.writeFile(
        workspaceRoot,
        "tsconfig.base.json",
        buildRootBaseTsconfig()
      ),
    ]);
  }

  private async writeProductPartFiles(
    workspaceRoot: string,
    node: TreeNode
  ): Promise<void> {
    await Promise.all([
      this.writeFile(
        workspaceRoot,
        `${node.codePath}/package.json`,
        buildProductPartPackageJson(node)
      ),
      this.writeFile(
        workspaceRoot,
        `${node.codePath}/tsconfig.json`,
        buildProductPartTsconfig()
      ),
      this.writeFile(
        workspaceRoot,
        `${node.codePath}/src/index.ts`,
        buildEntrypoint(`${node.codePath}/src/index.ts`)
      ),
    ]);
  }

  private async writeFile(
    workspaceRoot: string,
    relativePath: string,
    content: string
  ): Promise<void> {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, "utf8");
  }
}
