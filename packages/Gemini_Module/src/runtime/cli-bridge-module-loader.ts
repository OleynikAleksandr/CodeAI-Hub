import nodeModule from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GeminiCliModules } from "./cli-types";

const { createRequire } = nodeModule;

const toModuleUrl = (root: string, ...segments: readonly string[]): string => {
  const absolutePath = pathToFileURL(path.join(root, ...segments));
  return absolutePath.href;
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

export const loadGeminiModules = async (
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

export const validateGeminiCliCoreDependencyGraph = (
  cliCoreRoot: string,
  label: string
): void => {
  const requireFromCliCore = createRequire(
    path.join(cliCoreRoot, "package.json")
  );
  try {
    requireFromCliCore("fast-uri");
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${label} runtime dependency check failed for fast-uri: ${baseMessage}`
    );
  }
};
