import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const SEMVER_DIRECTORY_PATTERN = /^\d+\.\d+\.\d+$/u;
const SEMVER_PART_COUNT = 3;
const CORE_RUNTIME_ROOT = path.join(os.homedir(), ".codeai-hub", "core");

const supervisorRequire = createRequire(
  process.argv[1] ?? path.join(process.cwd(), "package.json")
);

export interface CoreRuntimeInfo {
  readonly appDir: string;
  readonly entryPoint: string;
  readonly nodePath: string;
  readonly platformKey: string;
  readonly runtimeDir: string;
  readonly version: string;
}

const detectPlatformKey = (): string | null => {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin" && arch === "arm64") {
    return "darwin-arm64";
  }
  if (platform === "darwin" && arch === "x64") {
    return "darwin-x64";
  }
  if (platform === "linux" && arch === "x64") {
    return "linux-x64";
  }
  if (platform === "win32" && arch === "x64") {
    return "win32-x64";
  }
  return null;
};

const isSemverDirectory = (name: string): boolean =>
  SEMVER_DIRECTORY_PATTERN.test(name);

const compareSemver = (a: string, b: string): number => {
  const pa = a.split(".").map((value) => Number.parseInt(value, 10));
  const pb = b.split(".").map((value) => Number.parseInt(value, 10));
  for (let index = 0; index < SEMVER_PART_COUNT; index += 1) {
    const av = pa[index] ?? 0;
    const bv = pb[index] ?? 0;
    if (av !== bv) {
      return av - bv;
    }
  }
  return 0;
};

export const tryResolveCoreRuntime = (): CoreRuntimeInfo | null => {
  const platformKey = detectPlatformKey();
  if (!platformKey) {
    return null;
  }

  const platformRoot = path.join(CORE_RUNTIME_ROOT, platformKey);
  let entries: string[];
  try {
    entries = readdirSync(platformRoot, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter(isSemverDirectory)
      .sort(compareSemver);
  } catch {
    return null;
  }

  if (entries.length === 0) {
    return null;
  }

  const version = entries.at(-1) as string;
  const runtimeDir = path.join(platformRoot, version);
  const appDir = path.join(runtimeDir, "app");
  const entryPoint = path.join(appDir, "dist", "index.js");

  const nodeBinary =
    platformKey === "win32-x64"
      ? path.join(runtimeDir, "node", "node.exe")
      : path.join(runtimeDir, "node", "bin", "node");

  if (!(existsSync(nodeBinary) && existsSync(entryPoint))) {
    return null;
  }

  return {
    platformKey,
    version,
    runtimeDir,
    nodePath: nodeBinary,
    appDir,
    entryPoint,
  };
};

export const resolveCoreEntryPoint = (): string => {
  try {
    const packagePath = supervisorRequire.resolve(
      "@codeai-hub/core/package.json"
    );
    return path.join(path.dirname(packagePath), "dist/index.js");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to resolve @codeai-hub/core entry point (${reason}). Run "npm run build --workspace @codeai-hub/core" and try again.`
    );
  }
};
