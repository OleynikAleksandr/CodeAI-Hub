import { promises as fs } from "node:fs";
import { RUNTIME_REGISTRY_FILE, STATE_DIR } from "./paths";

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

export type RuntimeRegistry = Partial<
  Record<RegistryComponent, RuntimeComponentEntry>
> & {
  network?: NetworkState;
};

const ensureStateDir = async (): Promise<void> => {
  await fs.mkdir(STATE_DIR, { recursive: true });
};

const readRuntimeRegistry = async (): Promise<RuntimeRegistry> => {
  try {
    const raw = await fs.readFile(RUNTIME_REGISTRY_FILE, "utf8");
    return JSON.parse(raw) as RuntimeRegistry;
  } catch {
    return {};
  }
};

const writeRuntimeRegistry = async (
  registry: RuntimeRegistry
): Promise<void> => {
  await ensureStateDir();
  await fs.writeFile(
    RUNTIME_REGISTRY_FILE,
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf8"
  );
};

export const recordCorePortPreference = async (port: number): Promise<void> => {
  const registry = await readRuntimeRegistry();
  registry.network = {
    ...registry.network,
    corePort: port,
    updatedAt: new Date().toISOString(),
  };
  await writeRuntimeRegistry(registry);
};

export const clearCorePortPreference = async (): Promise<void> => {
  const registry = await readRuntimeRegistry();
  if (!registry.network?.corePort) {
    return;
  }
  registry.network = {
    ...registry.network,
    corePort: undefined,
    updatedAt: new Date().toISOString(),
  };
  await writeRuntimeRegistry(registry);
};
