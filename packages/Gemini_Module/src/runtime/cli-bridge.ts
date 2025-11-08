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

const CLI_VENDOR_ROOT = path.resolve(__dirname, "..", "vendor");
const NODE_MODULES_ROOT = path.join(CLI_VENDOR_ROOT, "node_modules");
const CLI_CORE_DIR = path.join(NODE_MODULES_ROOT, "@google", "gemini-cli-core");
const METADATA_FILE = path.join(CLI_VENDOR_ROOT, "cli-bridge.json");
const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_BINARY_NAMES =
  process.platform === "win32"
    ? ["gemini.cmd", "gemini.exe", "gemini.bat", "gemini"]
    : ["gemini"];

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

const loadOptionalEsmModule = async <T>(
  root: string,
  ...segments: readonly string[]
): Promise<T | undefined> => {
  try {
    return await loadEsmModule<T>(root, ...segments);
  } catch {
    return;
  }
};

const readMetadata = async (): Promise<GeminiCliBridgeMetadata | null> => {
  try {
    const raw = await fs.readFile(METADATA_FILE, "utf8");
    return JSON.parse(raw) as GeminiCliBridgeMetadata;
  } catch {
    return null;
  }
};

const ensureDirectoryExists = async (target: string): Promise<void> => {
  await fs.access(target);
};

const normalizeCandidate = (candidate: string): string => {
  if (candidate.endsWith("package.json")) {
    return path.dirname(candidate);
  }
  return candidate;
};

const candidateRootsFromEnv = (): readonly string[] => {
  const nodePath = process.env.NODE_PATH;
  if (!nodePath) {
    return [];
  }
  return nodePath
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, GEMINI_CLI_PACKAGE));
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

const readCliPackageMetadata = async (
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
    const requireFromHere = createRequire(__filename);
    const resolved = requireFromHere.resolve(
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

  candidates.push(...candidateRootsFromEnv());
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
    const metadata = await readCliPackageMetadata(normalized);
    if (metadata) {
      return { root: normalized, version: metadata.version };
    }
  }

  throw new Error(
    "Gemini CLI package not found. Install it with `npm install -g @google/gemini-cli`."
  );
};

const loadGeminiModules = async (
  cliRoot: string
): Promise<GeminiCliModules> => {
  const [
    config,
    settings,
    extension,
    extensionEnablement,
    contentGenerator,
    toolScheduler,
    toolExecutor,
    turn,
    thoughtUtils,
    extensionManager,
  ] = await Promise.all([
    loadEsmModule<typeof import("@google/gemini-cli/dist/src/config/config")>(
      cliRoot,
      "dist",
      "src",
      "config",
      "config.js"
    ),
    loadEsmModule<typeof import("@google/gemini-cli/dist/src/config/settings")>(
      cliRoot,
      "dist",
      "src",
      "config",
      "settings.js"
    ),
    loadEsmModule<
      typeof import("@google/gemini-cli/dist/src/config/extension")
    >(cliRoot, "dist", "src", "config", "extension.js"),
    loadEsmModule<
      typeof import("@google/gemini-cli/dist/src/config/extensions/extensionEnablement")
    >(cliRoot, "dist", "src", "config", "extensions", "extensionEnablement.js"),
    loadEsmModule<
      typeof import("@google/gemini-cli-core/dist/src/core/contentGenerator")
    >(CLI_CORE_DIR, "dist", "src", "core", "contentGenerator.js"),
    loadEsmModule<
      typeof import("@google/gemini-cli-core/dist/src/core/coreToolScheduler")
    >(CLI_CORE_DIR, "dist", "src", "core", "coreToolScheduler.js"),
    loadEsmModule<
      typeof import("@google/gemini-cli-core/dist/src/core/nonInteractiveToolExecutor")
    >(CLI_CORE_DIR, "dist", "src", "core", "nonInteractiveToolExecutor.js"),
    loadEsmModule<typeof import("@google/gemini-cli-core/dist/src/core/turn")>(
      CLI_CORE_DIR,
      "dist",
      "src",
      "core",
      "turn.js"
    ),
    loadEsmModule<
      typeof import("@google/gemini-cli-core/dist/src/utils/thoughtUtils")
    >(CLI_CORE_DIR, "dist", "src", "utils", "thoughtUtils.js"),
    loadOptionalEsmModule<
      typeof import("@google/gemini-cli/dist/src/config/extension-manager")
    >(cliRoot, "dist", "src", "config", "extension-manager.js"),
  ]);

  return {
    config,
    settings,
    extension,
    extensionManager,
    extensionEnablement,
    contentGenerator,
    toolScheduler,
    toolExecutor,
    turn,
    thoughtUtils,
  };
};

export type LoadCliBridgeOptions = {
  readonly expectedCliVersion?: string;
  readonly reporter?: ModuleReporter;
};

export const loadCliBridgeFromVendor = async (
  options: LoadCliBridgeOptions = {}
): Promise<GeminiCliBridge> => {
  await ensureDirectoryExists(CLI_CORE_DIR);

  const { root: cliRoot, version: resolvedCliVersion } =
    await resolveGeminiCliRoot().catch((error: unknown) => {
      options.reporter?.error?.(
        "Gemini CLI is not installed or could not be located",
        error instanceof Error ? error : String(error)
      );
      throw error;
    });

  const metadataFromFile = (await readMetadata()) ?? {
    version: "unknown",
    preparedAt: new Date(0).toISOString(),
    source: "vendor",
  };

  const metadata: GeminiCliBridgeMetadata = {
    ...metadataFromFile,
    cli: {
      package: metadataFromFile.cli?.package ?? GEMINI_CLI_PACKAGE,
      requiredVersion:
        metadataFromFile.cli?.requiredVersion ?? options.expectedCliVersion,
      resolvedVersion: resolvedCliVersion,
      location: cliRoot,
    },
  };

  const { cli } = metadata;
  if (cli?.requiredVersion && cli.requiredVersion !== resolvedCliVersion) {
    options.reporter?.warn?.("Gemini CLI version mismatch detected", {
      expected: cli.requiredVersion,
      found: resolvedCliVersion,
      location: cliRoot,
    });
  }

  const modules = await loadGeminiModules(cliRoot);

  return {
    modules,
    metadata,
  };
};
