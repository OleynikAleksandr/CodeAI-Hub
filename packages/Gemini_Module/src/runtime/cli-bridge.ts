import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GeminiCliBridgeMetadata } from "../types";
import type { GeminiCliBridge, GeminiCliModules } from "./cli-types";

const CLI_VENDOR_ROOT = path.resolve(__dirname, "..", "vendor");
const NODE_MODULES_ROOT = path.join(CLI_VENDOR_ROOT, "node_modules");
const CLI_CORE_DIR = path.join(NODE_MODULES_ROOT, "@google", "gemini-cli-core");
const CLI_DIR = path.join(NODE_MODULES_ROOT, "@google", "gemini-cli");
const METADATA_FILE = path.join(CLI_VENDOR_ROOT, "cli-bridge.json");

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

const loadGeminiModules = async (): Promise<GeminiCliModules> => {
  const [
    config,
    settings,
    contentGenerator,
    toolScheduler,
    toolExecutor,
    turn,
    thoughtUtils,
  ] = await Promise.all([
    loadEsmModule<typeof import("@google/gemini-cli/dist/src/config/config")>(
      CLI_DIR,
      "dist",
      "src",
      "config",
      "config.js"
    ),
    loadEsmModule<typeof import("@google/gemini-cli/dist/src/config/settings")>(
      CLI_DIR,
      "dist",
      "src",
      "config",
      "settings.js"
    ),
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
  ]);

  return {
    config,
    settings,
    contentGenerator,
    toolScheduler,
    toolExecutor,
    turn,
    thoughtUtils,
  };
};

export const loadCliBridgeFromVendor = async (): Promise<GeminiCliBridge> => {
  await Promise.all([
    ensureDirectoryExists(CLI_CORE_DIR),
    ensureDirectoryExists(CLI_DIR),
  ]);

  const metadata = (await readMetadata()) ?? {
    version: "unknown",
    preparedAt: new Date(0).toISOString(),
    source: "vendor",
  };

  const modules = await loadGeminiModules();

  return {
    modules,
    metadata,
  };
};

export const getVendorRoot = (): string => CLI_VENDOR_ROOT;
export const getMetadataPath = (): string => METADATA_FILE;
export const getCliCoreDir = (): string => CLI_CORE_DIR;
export const getCliDir = (): string => CLI_DIR;
