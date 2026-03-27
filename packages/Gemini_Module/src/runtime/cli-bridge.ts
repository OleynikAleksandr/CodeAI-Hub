import { promises as fs } from "node:fs";
import nodeModule from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GeminiCliBridgeMetadata, ModuleReporter } from "../types";
import type { GeminiCliBridge, GeminiCliModules } from "./cli-types";

const { createRequire } = nodeModule;
const moduleGlobalPaths =
  (nodeModule as unknown as { globalPaths?: readonly string[] }).globalPaths ??
  [];
const requireFromWorkspaceRoot = createRequire(
  path.join(process.cwd(), "package.json")
);

const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_CLI_COMPATIBILITY_ERROR_CODE = "GEMINI_CLI_COMPATIBILITY_ERROR";
const GEMINI_BINARY_NAMES =
  process.platform === "win32"
    ? ["gemini.cmd", "gemini.exe", "gemini.bat", "gemini"]
    : ["gemini"];

type ErrorWithCode = Error & { code?: string; cause?: unknown };

const toModuleUrl = (root: string, ...segments: readonly string[]): string => {
  const absolutePath = path.join(root, ...segments);
  return pathToFileURL(absolutePath).href;
};

const dynamicImportModule = <T>(specifier: string): Promise<T> =>
  Function("specifier", "return import(specifier);")(specifier) as Promise<T>;

const loadEsmModule = async <T>(
  root: string,
  ...segments: readonly string[]
): Promise<T> => {
  const url = toModuleUrl(root, ...segments);
  const loaded = await dynamicImportModule<T>(url);
  return loaded as T;
};

const findAndLoadModule = async <T>(
  root: string,
  candidates: readonly (readonly string[])[]
): Promise<T> => {
  const errors: unknown[] = [];
  for (const segments of candidates) {
    try {
      return await loadEsmModule<T>(root, ...segments);
    } catch (error) {
      errors.push(error);
    }
  }
  throw new Error(
    `Failed to load module from any candidate path:\n${errors
      .map((e) => String(e))
      .join("\n")}`
  );
};

const createGeminiCliCompatibilityError = (
  error: unknown,
  options: { readonly cliRoot: string; readonly cliCoreRoot: string }
): ErrorWithCode => {
  const baseMessage =
    error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
  const wrapped = new Error(
    `Gemini CLI runtime compatibility failure. The installed @google/gemini-cli-core package layout does not match the expected runtime modules. cliRoot=${options.cliRoot}, cliCoreRoot=${options.cliCoreRoot}. Root error: ${baseMessage}`
  ) as ErrorWithCode;
  wrapped.name = "GeminiCliCompatibilityError";
  wrapped.code = GEMINI_CLI_COMPATIBILITY_ERROR_CODE;
  wrapped.cause = error;
  return wrapped;
};

export const isGeminiCliCompatibilityError = (error: unknown): boolean =>
  error instanceof Error &&
  (error as { code?: string }).code === GEMINI_CLI_COMPATIBILITY_ERROR_CODE;

const normalizeCandidate = (candidate: string): string => {
  if (candidate.endsWith("package.json")) {
    return path.dirname(candidate);
  }
  return candidate;
};

const candidateRootsFromEnv = (packageName: string): readonly string[] => {
  const nodePath = process.env.NODE_PATH;
  if (!nodePath) {
    return [];
  }
  return nodePath
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, packageName));
};

const candidateRootsFromBinaryPath = async (): Promise<string[]> => {
  const pathEnv = process.env.PATH;
  if (!pathEnv) {
    return [];
  }

  const results: string[] = [];
  const segments = pathEnv.split(path.delimiter).filter(Boolean);

  for (const segment of segments) {
    for (const binaryName of GEMINI_BINARY_NAMES) {
      const binaryCandidate = path.join(segment, binaryName);
      try {
        await fs.access(binaryCandidate);
      } catch {
        continue;
      }
      const resolvedDir = path.resolve(segment, "..");
      results.push(
        path.join(resolvedDir, "lib", "node_modules", GEMINI_CLI_PACKAGE)
      );
      results.push(path.join(resolvedDir, "node_modules", GEMINI_CLI_PACKAGE));
    }
  }

  return results;
};

const readPackageMetadata = async (
  root: string
): Promise<{ readonly version: string } | null> => {
  const packageJsonPath = path.join(root, "package.json");
  try {
    const raw = await fs.readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(raw) as { readonly version?: string };
    if (!parsed.version) {
      return null;
    }
    return { version: parsed.version };
  } catch {
    return null;
  }
};

const resolveGeminiCliRoot = async (): Promise<{
  readonly root: string;
  readonly version: string;
}> => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const override = process.env.CODEAI_HUB_GEMINI_CLI_ROOT?.trim();
  if (override) {
    candidates.push(override);
  }

  const npmPrefix =
    process.env.NPM_CONFIG_PREFIX ?? process.env.npm_config_prefix;
  if (npmPrefix) {
    candidates.push(
      path.join(npmPrefix, "lib", "node_modules", GEMINI_CLI_PACKAGE)
    );
    candidates.push(path.join(npmPrefix, "node_modules", GEMINI_CLI_PACKAGE));
  }

  try {
    const resolved = requireFromWorkspaceRoot.resolve(
      `${GEMINI_CLI_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  const binaryCandidates = await candidateRootsFromBinaryPath();
  candidates.push(...binaryCandidates);

  for (const globalPath of moduleGlobalPaths) {
    if (globalPath) {
      candidates.push(path.join(globalPath, GEMINI_CLI_PACKAGE));
    }
  }

  candidates.push(...candidateRootsFromEnv(GEMINI_CLI_PACKAGE));
  candidates.push(
    path.join(process.cwd(), "node_modules", "@google", "gemini-cli")
  );
  const homeDirectory = homedir();
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "lib",
      "node_modules",
      GEMINI_CLI_PACKAGE
    )
  );
  candidates.push(
    path.join(homeDirectory, ".npm-global", "node_modules", GEMINI_CLI_PACKAGE)
  );

  for (const candidate of candidates) {
    const normalized = path.resolve(normalizeCandidate(candidate));
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const metadata = await readPackageMetadata(normalized);
    if (metadata) {
      return { root: normalized, version: metadata.version };
    }
  }

  throw new Error(
    "Gemini CLI package not found. Install it with `npm install -g @google/gemini-cli`."
  );
};

const resolveGeminiCliCoreRoot = async (
  cliRoot: string
): Promise<{ readonly root: string; readonly version: string }> => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  try {
    const requireFromCli = createRequire(path.join(cliRoot, "package.json"));
    const resolved = requireFromCli.resolve(
      `${GEMINI_CLI_CORE_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  const npmPrefix =
    process.env.NPM_CONFIG_PREFIX ?? process.env.npm_config_prefix;
  if (npmPrefix) {
    candidates.push(
      path.join(npmPrefix, "lib", "node_modules", GEMINI_CLI_CORE_PACKAGE)
    );
    candidates.push(
      path.join(npmPrefix, "node_modules", GEMINI_CLI_CORE_PACKAGE)
    );
  }

  try {
    const resolved = requireFromWorkspaceRoot.resolve(
      `${GEMINI_CLI_CORE_PACKAGE}/package.json`
    );
    candidates.push(resolved);
  } catch {
    // ignore resolution errors
  }

  for (const globalPath of moduleGlobalPaths) {
    if (globalPath) {
      candidates.push(path.join(globalPath, GEMINI_CLI_CORE_PACKAGE));
    }
  }

  candidates.push(...candidateRootsFromEnv(GEMINI_CLI_CORE_PACKAGE));
  candidates.push(
    path.join(process.cwd(), "node_modules", "@google", "gemini-cli-core")
  );
  const homeDirectory = homedir();
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "lib",
      "node_modules",
      GEMINI_CLI_CORE_PACKAGE
    )
  );
  candidates.push(
    path.join(
      homeDirectory,
      ".npm-global",
      "node_modules",
      GEMINI_CLI_CORE_PACKAGE
    )
  );

  for (const candidate of candidates) {
    const normalized = path.resolve(normalizeCandidate(candidate));
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const metadata = await readPackageMetadata(normalized);
    if (metadata) {
      return { root: normalized, version: metadata.version };
    }
  }

  throw new Error(
    "Gemini CLI Core package not found. Install it with `npm install -g @google/gemini-cli-core`."
  );
};

const loadGeminiModules = async (
  cliRoot: string,
  cliCoreRoot: string
): Promise<GeminiCliModules> => {
  const [
    config,
    settings,
    extension,
    extensionEnablement,
    contentGenerator,
    toolScheduler,
    turn,
    thoughtUtils,
  ] = await Promise.all([
    findAndLoadModule<
      typeof import("@google/gemini-cli/dist/src/config/config")
    >(cliRoot, [
      ["dist", "src", "config", "config.js"],
      ["dist", "config", "config.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli/dist/src/config/settings")
    >(cliRoot, [
      ["dist", "src", "config", "settings.js"],
      ["dist", "config", "settings.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli/dist/src/config/extension")
    >(cliRoot, [
      ["dist", "src", "config", "extension.js"],
      ["dist", "config", "extension.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli/dist/src/config/extensions/extensionEnablement")
    >(cliRoot, [
      ["dist", "src", "config", "extensions", "extensionEnablement.js"],
      ["dist", "config", "extensions", "extensionEnablement.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/core/contentGenerator")
    >(cliCoreRoot, [
      ["dist", "src", "core", "contentGenerator.js"],
      ["dist", "core", "contentGenerator.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/core/coreToolScheduler")
    >(cliCoreRoot, [
      ["dist", "src", "core", "coreToolScheduler.js"],
      ["dist", "core", "coreToolScheduler.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/core/turn")
    >(cliCoreRoot, [
      ["dist", "src", "core", "turn.js"],
      ["dist", "core", "turn.js"],
    ]),
    findAndLoadModule<
      typeof import("@google/gemini-cli-core/dist/src/utils/thoughtUtils")
    >(cliCoreRoot, [
      ["dist", "src", "utils", "thoughtUtils.js"],
      ["dist", "utils", "thoughtUtils.js"],
    ]),
  ]);

  return {
    config,
    settings,
    extension,
    extensionEnablement,
    contentGenerator,
    toolScheduler,
    turn,
    thoughtUtils,
  };
};

export interface LoadCliBridgeOptions {
  readonly expectedCliVersion?: string;
  readonly expectedCoreVersion?: string;
  readonly reporter?: ModuleReporter;
}

export const loadCliBridgeFromGlobal = async (
  options: LoadCliBridgeOptions = {}
): Promise<GeminiCliBridge> => {
  const { root: cliRoot, version: resolvedCliVersion } =
    await resolveGeminiCliRoot().catch((error: unknown) => {
      options.reporter?.error?.(
        "Gemini CLI is not installed or could not be located",
        error instanceof Error ? error : String(error)
      );
      throw error;
    });

  const { root: cliCoreRoot, version: resolvedCoreVersion } =
    await resolveGeminiCliCoreRoot(cliRoot).catch((error: unknown) => {
      options.reporter?.error?.(
        "Gemini CLI Core is not installed or could not be located",
        error instanceof Error ? error : String(error)
      );
      throw error;
    });

  if (
    options.expectedCliVersion &&
    options.expectedCliVersion !== resolvedCliVersion
  ) {
    options.reporter?.warn?.("Gemini CLI version mismatch detected", {
      expected: options.expectedCliVersion,
      found: resolvedCliVersion,
      location: cliRoot,
    });
  }

  if (
    options.expectedCoreVersion &&
    options.expectedCoreVersion !== resolvedCoreVersion
  ) {
    options.reporter?.warn?.("Gemini CLI Core version mismatch detected", {
      expected: options.expectedCoreVersion,
      found: resolvedCoreVersion,
      location: cliCoreRoot,
    });
  }

  const modules = await loadGeminiModules(cliRoot, cliCoreRoot).catch(
    (error: unknown) => {
      const compatibilityError = createGeminiCliCompatibilityError(error, {
        cliRoot,
        cliCoreRoot,
      });
      options.reporter?.error?.(
        "Gemini CLI runtime module compatibility check failed",
        compatibilityError
      );
      throw compatibilityError;
    }
  );

  const metadata: GeminiCliBridgeMetadata = {
    version: resolvedCliVersion,
    preparedAt: new Date().toISOString(),
    source: "global",
    cli: {
      package: GEMINI_CLI_PACKAGE,
      requiredVersion: options.expectedCliVersion,
      resolvedVersion: resolvedCliVersion,
      location: cliRoot,
    },
    cliCore: {
      package: GEMINI_CLI_CORE_PACKAGE,
      version: resolvedCoreVersion,
    },
  };

  return {
    modules,
    metadata,
  };
};
