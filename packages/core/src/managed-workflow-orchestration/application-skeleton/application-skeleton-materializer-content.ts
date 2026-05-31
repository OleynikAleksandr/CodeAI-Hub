export interface ApplicationSkeletonMaterializerNode {
  readonly codePath: string;
  readonly id: string;
}

const TYPESCRIPT_ENTRYPOINT_RE = /\.(?:ts|tsx|mts|cts)$/u;
const JAVASCRIPT_OR_TYPESCRIPT_ENTRYPOINT_RE = /\.(?:js|mjs|ts|tsx|mts|cts)$/u;
const GO_MOD_SUFFIX_RE = /\/go\.mod$/u;
const NON_GO_MODULE_CHARACTER_RE = /[^a-z0-9_./-]/giu;
const TYPESCRIPT_CONFIG_RE = /\.(?:ts|mts)$/u;
const JAVASCRIPT_CONFIG_RE = /\.(?:js|mjs)$/u;

const slugName = (value: string): string =>
  value.replace(/[^a-z0-9-]/giu, "-").toLowerCase();

const jsonFile = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;

const moduleNameFromPath = (relativePath: string): string =>
  slugName(relativePath.split("/").filter(Boolean).at(-2) ?? "module");

const goPackageFromPath = (relativePath: string): string => {
  if (relativePath.includes("/cmd/") || relativePath.endsWith("/main.go")) {
    return "main";
  }
  const packageName = moduleNameFromPath(relativePath).replace(/-/gu, "_");
  return packageName || "module";
};

export const shouldMaterializeNpmProductPart = (params: {
  readonly configFiles: readonly string[];
  readonly entrypoints: readonly string[];
  readonly node: ApplicationSkeletonMaterializerNode;
}): boolean =>
  params.configFiles.some(
    (configFile) =>
      configFile === `${params.node.codePath}/package.json` ||
      configFile === `${params.node.codePath}/tsconfig.json`
  ) ||
  params.entrypoints.some(
    (entrypoint) =>
      entrypoint.startsWith(`${params.node.codePath}/`) &&
      TYPESCRIPT_ENTRYPOINT_RE.test(entrypoint)
  );

export const buildRootPackageJson = (
  packageManager: string,
  productParts: readonly ApplicationSkeletonMaterializerNode[]
): string =>
  jsonFile({
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
  });

export const buildPackageLock = (
  productParts: readonly ApplicationSkeletonMaterializerNode[]
): string =>
  jsonFile({
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
  });

export const buildProductPartPackageJson = (
  node: ApplicationSkeletonMaterializerNode
): string =>
  jsonFile({
    name: `@codeai-hub/${slugName(node.id)}`,
    private: true,
    scripts: {
      build: "tsc -p tsconfig.json",
      "test:smoke": `node -e "console.log('${node.id} smoke ok')"`,
      typecheck: "tsc -p tsconfig.json --noEmit",
    },
    version: "0.0.0",
  });

export const buildProductPartTsconfig = (): string =>
  jsonFile({
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      outDir: "dist",
      rootDir: ".",
    },
    include: [
      "src/**/*.ts",
      "src/**/*.tsx",
      "clusters/**/*.ts",
      "clusters/**/*.tsx",
      "modules/**/*.ts",
      "modules/**/*.tsx",
    ],
  });

export const buildRootWorkspaceTsconfig = (
  productParts: readonly ApplicationSkeletonMaterializerNode[]
): string =>
  jsonFile({
    files: [],
    references: productParts.map((node) => ({ path: node.codePath })),
  });

export const buildRootBaseTsconfig = (): string =>
  jsonFile({
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
  });

export const buildReadme = (params: {
  readonly id: string;
  readonly kind: string;
}): string =>
  `# ${params.id}\n\nMaterialized ${params.kind} placeholder for implementation agents.\n`;

export const buildEntrypoint = (relativePath: string): string => {
  const moduleId = slugName(
    relativePath.split("/").filter(Boolean).at(-1) ?? "module"
  );
  if (relativePath.endsWith(".py")) {
    return [
      `MODULE_ID = ${JSON.stringify(moduleId)}`,
      "",
      "",
      "def main() -> None:",
      "    return None",
      "",
      "",
      'if __name__ == "__main__":',
      "    main()",
      "",
    ].join("\n");
  }
  if (relativePath.endsWith(".go")) {
    const packageName = goPackageFromPath(relativePath);
    return packageName === "main"
      ? "package main\n\nfunc main() {}\n"
      : `package ${packageName}\n\nconst ModuleID = ${JSON.stringify(moduleId)}\n`;
  }
  if (relativePath.endsWith(".cjs")) {
    return `module.exports = { moduleId: ${JSON.stringify(moduleId)} };\n`;
  }
  if (JAVASCRIPT_OR_TYPESCRIPT_ENTRYPOINT_RE.test(relativePath)) {
    return `export const moduleId = ${JSON.stringify(moduleId)};\n`;
  }
  return `# ${moduleId}\n`;
};

export const buildDeclaredConfigFile = (relativePath: string): string => {
  if (relativePath.endsWith("pyproject.toml")) {
    const projectName = moduleNameFromPath(relativePath);
    return [
      "[project]",
      `name = "${projectName}"`,
      'version = "0.0.0"',
      'requires-python = ">=3.13"',
      "dependencies = []",
      "",
      "[tool.pytest.ini_options]",
      'testpaths = ["tests"]',
      "",
    ].join("\n");
  }
  if (relativePath.endsWith("go.mod")) {
    const moduleName = relativePath
      .replace(GO_MOD_SUFFIX_RE, "")
      .replace(NON_GO_MODULE_CHARACTER_RE, "-")
      .toLowerCase();
    return `module ${moduleName}\n\ngo 1.24\n`;
  }
  if (relativePath.endsWith(".json")) {
    return "{}\n";
  }
  if (TYPESCRIPT_CONFIG_RE.test(relativePath)) {
    return "export default {};\n";
  }
  if (JAVASCRIPT_CONFIG_RE.test(relativePath)) {
    return "export default {};\n";
  }
  if (relativePath.endsWith(".cjs")) {
    return "module.exports = {};\n";
  }
  return "# Generated by CodeAI Hub Application Skeleton materializer.\n";
};
