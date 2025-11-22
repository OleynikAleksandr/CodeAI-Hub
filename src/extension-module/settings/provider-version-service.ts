import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const BYTES_PER_MEGABYTE = 1_048_576;
const NPM_MAX_BUFFER_MB = 10;
const EXEC_MAX_BUFFER_BYTES = NPM_MAX_BUFFER_MB * BYTES_PER_MEGABYTE;

export const PACKAGE_MAP = {
  claude: {
    cli: "@anthropic-ai/claude-code",
    sdk: "@anthropic-ai/claude-agent-sdk",
  },
  codex: {
    cli: "@openai/codex",
    sdk: "@openai/codex-sdk",
  },
  gemini: {
    core: "@google/gemini-cli-core",
  },
} as const;

export type ProviderId = keyof typeof PACKAGE_MAP;
export type VersionTarget = "cli" | "sdk" | "core";

export type VersionEntry = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly source: "global";
  readonly error?: string | null;
};

export type ProviderVersionsSnapshot = {
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly gemini: {
    readonly core: VersionEntry;
  };
  readonly checkedAt: string;
};

type PackageDescriptor = {
  readonly provider: ProviderId;
  readonly target: VersionTarget;
  readonly packageName: string;
};

type PackageVersionResult = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly error?: string;
};

const nowIso = (): string => new Date().toISOString();

const resolvePackageName = (
  provider: ProviderId,
  target: VersionTarget
): string => {
  const descriptor = PACKAGE_MAP[provider] as Record<string, string>;
  const packageName = descriptor[target];
  if (!packageName) {
    throw new Error(`Unknown package mapping for ${provider}/${target}`);
  }
  return packageName;
};

const describeExecError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const resolveDescriptors = (): PackageDescriptor[] =>
  (
    Object.entries(PACKAGE_MAP) as [
      ProviderId,
      Partial<Record<VersionTarget, string>>,
    ][]
  ).flatMap(([provider, targets]) =>
    (Object.entries(targets) as [VersionTarget, string][]).map(
      ([target, packageName]) => ({
        provider,
        target,
        packageName,
      })
    )
  );

const extractInstalledVersion = (
  packageName: string,
  output: string
): string | null => {
  try {
    const parsed = JSON.parse(output) as {
      readonly dependencies?: Record<
        string,
        { readonly version?: string; readonly resolved?: string }
      >;
    };
    const version = parsed.dependencies?.[packageName]?.version;
    if (typeof version === "string" && version.trim().length > 0) {
      return version.trim();
    }
  } catch {
    /* ignore parse failures */
  }
  return null;
};

const readInstalledVersion = async (
  packageName: string
): Promise<{ version: string | null; error?: string }> => {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return { version: extractInstalledVersion(packageName, stdout) };
  } catch (error) {
    const candidateStdout =
      (error as { stdout?: string | undefined })?.stdout ?? "";
    const version = extractInstalledVersion(packageName, candidateStdout);
    if (version) {
      return { version };
    }
    return { version: null, error: describeExecError(error) };
  }
};

export const readLatestVersion = async (
  packageName: string
): Promise<{ version: string | null; error?: string }> => {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} view ${packageName} version --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    const cleaned = stdout.trim();
    if (!cleaned) {
      return { version: null };
    }
    try {
      const parsed = JSON.parse(cleaned) as string | string[];
      if (typeof parsed === "string") {
        return { version: parsed.trim() };
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const candidate = parsed.at(-1);
        return { version: typeof candidate === "string" ? candidate : null };
      }
    } catch {
      return { version: cleaned };
    }
    return { version: null };
  } catch (error) {
    return { version: null, error: describeExecError(error) };
  }
};

const toVersionEntry = (result: PackageVersionResult): VersionEntry => ({
  packageName: result.packageName,
  currentVersion: result.currentVersion,
  latestVersion: result.latestVersion,
  source: "global",
  error: result.error ?? null,
});

const buildSnapshot = (
  results: readonly PackageVersionResult[]
): ProviderVersionsSnapshot => {
  const get = (provider: ProviderId, target: VersionTarget): VersionEntry => {
    const packageName = resolvePackageName(provider, target);
    const match = results.find((result) => result.packageName === packageName);
    if (!match) {
      return {
        packageName,
        currentVersion: null,
        latestVersion: null,
        source: "global",
        error: "Version information unavailable",
      };
    }
    return toVersionEntry(match);
  };

  return {
    claude: {
      cli: get("claude", "cli"),
      sdk: get("claude", "sdk"),
    },
    codex: {
      cli: get("codex", "cli"),
      sdk: get("codex", "sdk"),
    },
    gemini: {
      core: get("gemini", "core"),
    },
    checkedAt: nowIso(),
  };
};

import { GeminiVersionReader } from "./gemini-version-reader";

export class ProviderVersionService {
  private readonly extensionPath: string;
  private readonly geminiReader: GeminiVersionReader;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
    this.geminiReader = new GeminiVersionReader(extensionPath);
  }

  async loadSnapshot(): Promise<ProviderVersionsSnapshot> {
    const descriptors = resolveDescriptors();
    const results = await Promise.all(
      descriptors.map(async ({ packageName, provider, target }) => {
        if (provider === "gemini" && target === "core") {
          return this.geminiReader.read();
        }
        const installed = await readInstalledVersion(packageName);
        const latest = await readLatestVersion(packageName);
        return {
          packageName,
          currentVersion: installed.version,
          latestVersion: latest.version,
          error: installed.error ?? latest.error,
        } satisfies PackageVersionResult;
      })
    );
    return buildSnapshot(results);
  }

  async updateTarget(
    provider: Exclude<ProviderId, "gemini">,
    target: Exclude<VersionTarget, "core">
  ): Promise<ProviderVersionsSnapshot> {
    const packageName = resolvePackageName(provider, target);
    await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
      maxBuffer: EXEC_MAX_BUFFER_BYTES,
    });
    return this.loadSnapshot();
  }
}
