import nodeModule from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GeminiCliBridgeMetadata, ModuleReporter } from "../types";
import {
  resolveGeminiCliCoreRoot,
  resolveGeminiCliRoot,
} from "./cli-bridge-root-resolver";
import type { GeminiCliBridge, GeminiCliModules } from "./cli-types";

const { createRequire } = nodeModule;
const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_CLI_COMPATIBILITY_ERROR_CODE = "GEMINI_CLI_COMPATIBILITY_ERROR";

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

const validateCliCoreDependencyGraph = (cliCoreRoot: string): void => {
  const requireFromCliCore = createRequire(
    path.join(cliCoreRoot, "package.json")
  );
  try {
    requireFromCliCore("fast-uri");
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gemini CLI Core runtime dependency check failed for fast-uri: ${baseMessage}`
    );
  }
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
  try {
    validateCliCoreDependencyGraph(cliCoreRoot);
  } catch (error) {
    const compatibilityError = createGeminiCliCompatibilityError(error, {
      cliRoot,
      cliCoreRoot,
    });
    options.reporter?.error?.(
      "Gemini CLI runtime dependency check failed",
      compatibilityError
    );
    throw compatibilityError;
  }

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
