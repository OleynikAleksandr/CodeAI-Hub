import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./application-skeleton-foundation-contract";

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

const toPackageName = (id: string): string =>
  `@codeai-hub/${id.replace(/[^a-z0-9-]/giu, "-").toLowerCase()}`;

const buildRootPackageJson = (
  packageManager: string,
  productParts: readonly TreeNode[]
): string =>
  `${JSON.stringify(
    {
      name: "codeai-generated-workspace",
      private: true,
      scripts: {
        build: `${packageManager} run build --workspaces --if-present`,
        "test:smoke": `${packageManager} run test:smoke --workspaces --if-present`,
        typecheck: `${packageManager} run typecheck --workspaces --if-present`,
      },
      workspaces: productParts.map((node) => node.codePath),
      devDependencies: {
        typescript: "^5.9.3",
      },
    },
    null,
    2
  )}\n`;

const buildPackageLock = (productParts: readonly TreeNode[]): string =>
  `${JSON.stringify(
    {
      name: "codeai-generated-workspace",
      lockfileVersion: 3,
      requires: true,
      packages: {
        "": {
          name: "codeai-generated-workspace",
          workspaces: productParts.map((node) => node.codePath),
          devDependencies: {
            typescript: "^5.9.3",
          },
        },
      },
    },
    null,
    2
  )}\n`;

const buildProductPartPackageJson = (node: TreeNode): string =>
  `${JSON.stringify(
    {
      name: toPackageName(node.id),
      private: true,
      scripts: {
        build: "tsc -p tsconfig.json",
        "test:smoke": `node -e "console.log('${node.id} smoke ok')"`,
        typecheck: "tsc -p tsconfig.json --noEmit",
      },
      version: "0.0.0",
    },
    null,
    2
  )}\n`;

const buildProductPartTsconfig = (): string =>
  `${JSON.stringify(
    {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        outDir: "dist",
        rootDir: ".",
      },
      include: ["src/**/*.ts", "clusters/**/*.ts", "modules/**/*.ts"],
    },
    null,
    2
  )}\n`;

const buildRootTsconfig = (): string =>
  `${JSON.stringify(
    {
      compilerOptions: {
        declaration: true,
        esModuleInterop: true,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmitOnError: true,
        outDir: "dist",
        strict: true,
        target: "ES2022",
      },
    },
    null,
    2
  )}\n`;

const buildReadme = (node: TreeNode): string =>
  `# ${node.id}\n\nMaterialized ${node.kind} placeholder for implementation agents.\n`;

const buildEntrypoint = (id: string): string =>
  `export const moduleId = ${JSON.stringify(id)};\n`;

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
    const firstWaveEntrypoints = unique([
      ...readStringArray(foundation, "firstWaveEntrypoints"),
      ...productParts.map((node) => `${node.codePath}/src/index.ts`),
    ]);
    const basePaths = unique([
      ".gitignore",
      ".npmrc",
      "package-lock.json",
      "package.json",
      "tsconfig.base.json",
      ...allNodes.flatMap((node) => [
        node.codePath,
        `${node.codePath}/README.md`,
      ]),
      ...productParts.flatMap((node) => [
        `${node.codePath}/package.json`,
        `${node.codePath}/tsconfig.json`,
      ]),
      ...firstWaveEntrypoints,
    ]);
    await this.writeRootFiles(
      params.workspaceRoot,
      packageManager,
      productParts
    );
    await Promise.all(
      productParts.map((node) =>
        this.writeProductPartFiles(params.workspaceRoot, node)
      )
    );
    await Promise.all(
      allNodes.map((node) =>
        this.writeFile(
          params.workspaceRoot,
          `${node.codePath}/README.md`,
          buildReadme(node)
        )
      )
    );
    await Promise.all(
      firstWaveEntrypoints.map((entrypoint) =>
        this.writeFile(
          params.workspaceRoot,
          entrypoint,
          buildEntrypoint(slugFromPath(entrypoint))
        )
      )
    );
    const nextFoundation = {
      ...foundation,
      configFiles: unique([
        ...readStringArray(foundation, "configFiles"),
        ".gitignore",
        ".npmrc",
        "package-lock.json",
        "package.json",
        "tsconfig.base.json",
      ]),
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

  private async writeRootFiles(
    workspaceRoot: string,
    packageManager: string,
    productParts: readonly TreeNode[]
  ): Promise<void> {
    await Promise.all([
      this.writeFile(
        workspaceRoot,
        ".gitignore",
        "node_modules/\ndist/\n.codeai-hub/state/\n.DS_Store\n"
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
      this.writeFile(workspaceRoot, "tsconfig.base.json", buildRootTsconfig()),
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
        buildEntrypoint(node.id)
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
