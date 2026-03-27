import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

type RegistryComponent = "core" | "launcher" | "cef" | "vsix";

interface RuntimeComponentEntry {
  readonly path?: string;
  readonly platform?: string;
  readonly updatedAt: string;
  readonly version: string;
}

interface NetworkState {
  readonly corePort?: number;
  readonly updatedAt: string;
}

type RuntimeRegistry = Partial<
  Record<RegistryComponent, RuntimeComponentEntry>
> & {
  network?: NetworkState;
};

const STATE_DIR = path.join(homedir(), ".codeai-hub", "state");
const REGISTRY_FILE = path.join(STATE_DIR, "runtime-registry.json");
const CURRENT_POINTER_NAME = "current";

const ensureStateDirectory = async (): Promise<void> => {
  await fs.mkdir(STATE_DIR, { recursive: true });
};

const readRegistry = async (): Promise<RuntimeRegistry> => {
  try {
    const raw = await fs.readFile(REGISTRY_FILE, "utf8");
    return JSON.parse(raw) as RuntimeRegistry;
  } catch {
    return {};
  }
};

const writeRegistry = async (registry: RuntimeRegistry): Promise<void> => {
  await ensureStateDirectory();
  await fs.writeFile(
    REGISTRY_FILE,
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  );
};

const recordComponentState = async (
  component: RegistryComponent,
  entry: Omit<RuntimeComponentEntry, "updatedAt">
): Promise<void> => {
  const registry = await readRegistry();
  registry[component] = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  await writeRegistry(registry);
};

export const writeCurrentPointer = async (
  baseDir: string,
  version: string
): Promise<void> => {
  await fs.mkdir(baseDir, { recursive: true });
  await fs.writeFile(
    path.join(baseDir, CURRENT_POINTER_NAME),
    `${version}\n`,
    "utf8"
  );
};

export const recordCoreInstall = async (options: {
  readonly version: string;
  readonly platform: string;
  readonly runtimeDir: string;
}): Promise<void> =>
  recordComponentState("core", {
    version: options.version,
    platform: options.platform,
    path: options.runtimeDir,
  });

export const recordCefInstall = async (options: {
  readonly version: string;
  readonly platform: string;
  readonly runtimeDir: string;
}): Promise<void> =>
  recordComponentState("cef", {
    version: options.version,
    platform: options.platform,
    path: options.runtimeDir,
  });

export const recordLauncherInstall = async (options: {
  readonly version: string;
  readonly platform: string;
  readonly installDir: string;
}): Promise<void> =>
  recordComponentState("launcher", {
    version: options.version,
    platform: options.platform,
    path: options.installDir,
  });

export const recordVsixVersion = async (options: {
  readonly version: string;
  readonly extensionPath: string;
}): Promise<void> =>
  recordComponentState("vsix", {
    version: options.version,
    path: options.extensionPath,
  });

export const readPreferredCorePort = async (): Promise<number | undefined> => {
  const registry = await readRegistry();
  const port = registry.network?.corePort;
  return typeof port === "number" && Number.isFinite(port) ? port : undefined;
};
