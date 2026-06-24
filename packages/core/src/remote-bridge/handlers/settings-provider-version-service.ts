import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const EXEC_MAX_BUFFER_BYTES = 10 * 1_048_576;
const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";
const OPENCODE_VERSION_COMMAND =
  process.platform === "win32"
    ? "opencode.cmd --version"
    : "opencode --version";
const OPENCODE_LATEST_PACKAGE_NAME = "@opencode-ai/sdk";
const VERSION_PATTERN = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/;
const execAsync = promisify(exec);

const PACKAGE_MAP = {
  claude: {
    cli: "@anthropic-ai/claude-code",
    sdk: "@anthropic-ai/claude-agent-sdk",
  },
  codex: {
    cli: "@openai/codex",
    sdk: "@openai/codex-sdk",
  },
  glmOpenCode: {
    cli: "opencode",
    sdk: "@opencode-ai/sdk",
  },
} as const;

type ProviderId = keyof typeof PACKAGE_MAP;
type VersionTarget = "cli" | "sdk";

interface PackageDescriptor {
  readonly packageName: string;
  readonly provider: ProviderId;
  readonly target: VersionTarget;
}

interface PackageVersionResult {
  readonly currentVersion: string | null;
  readonly error?: string;
  readonly latestVersion: string | null;
  readonly packageName: string;
}

interface VersionEntry {
  readonly currentVersion: string | null;
  readonly error?: string | null;
  readonly latestVersion: string | null;
  readonly packageName: string;
  readonly source: "global";
}

export interface SettingsProviderVersionsSnapshot {
  readonly checkedAt: string;
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly glmOpenCode: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
}

const describeExecError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const combineErrors = (
  ...errors: readonly (string | undefined)[]
): string | undefined => {
  const messages = errors.filter((error): error is string => Boolean(error));
  return messages.length > 0 ? messages.join("; ") : undefined;
};

const extractInstalledVersion = (
  packageName: string,
  output: string
): string | null => {
  try {
    const parsed = JSON.parse(output) as {
      readonly dependencies?: Record<
        string,
        { readonly resolved?: string; readonly version?: string }
      >;
    };
    const version = parsed.dependencies?.[packageName]?.version;
    return typeof version === "string" && version.trim().length > 0
      ? version.trim()
      : null;
  } catch {
    return null;
  }
};

const readInstalledVersion = async (
  packageName: string
): Promise<{ readonly error?: string; readonly version: string | null }> => {
  try {
    const { stdout } = await execAsync(
      `${NPM_COMMAND} list -g ${packageName} --depth=0 --json`,
      { maxBuffer: EXEC_MAX_BUFFER_BYTES }
    );
    return { version: extractInstalledVersion(packageName, stdout) };
  } catch (error) {
    const candidateStdout =
      (error as { readonly stdout?: string | undefined })?.stdout ?? "";
    const version = extractInstalledVersion(packageName, candidateStdout);
    return version
      ? { version }
      : { error: describeExecError(error), version: null };
  }
};

const readLatestVersion = async (
  packageName: string
): Promise<{ readonly error?: string; readonly version: string | null }> => {
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
    return { error: describeExecError(error), version: null };
  }
};

const readCommandVersion = async (
  command: string
): Promise<{ readonly error?: string; readonly version: string | null }> => {
  try {
    const { stdout } = await execAsync(command, {
      maxBuffer: EXEC_MAX_BUFFER_BYTES,
    });
    return { version: stdout.match(VERSION_PATTERN)?.[0] ?? null };
  } catch (error) {
    return { error: describeExecError(error), version: null };
  }
};

const readOpenCodeVersion = async (): Promise<PackageVersionResult> => {
  const [installed, latest] = await Promise.all([
    readCommandVersion(OPENCODE_VERSION_COMMAND),
    readLatestVersion(OPENCODE_LATEST_PACKAGE_NAME),
  ]);

  return {
    currentVersion: installed.version,
    error: combineErrors(installed.error, latest.error),
    latestVersion: latest.version,
    packageName: PACKAGE_MAP.glmOpenCode.cli,
  };
};

const resolveOpenCodeProviderPackagePath = async (): Promise<string | null> => {
  const root = path.join(homedir(), ".codeai-hub", "providers", "opencode");
  try {
    const version = (
      await fs.readFile(path.join(root, "latest"), "utf8")
    ).trim();
    const packagePath = path.join(root, version, "package.json");
    await fs.access(packagePath);
    return packagePath;
  } catch {
    return null;
  }
};

const readBundledPackageVersion = async (
  packageName: string
): Promise<{ readonly error?: string; readonly version: string | null }> => {
  const packagePath = await resolveOpenCodeProviderPackagePath();
  if (!packagePath) {
    return {
      error: "Installed OpenCode provider package.json was not found.",
      version: null,
    };
  }
  try {
    const parsed = JSON.parse(await fs.readFile(packagePath, "utf8")) as {
      readonly dependencies?: Record<string, unknown>;
    };
    const version = parsed.dependencies?.[packageName];
    return {
      version:
        typeof version === "string" && version.trim().length > 0
          ? version.trim()
          : null,
    };
  } catch (error) {
    return { error: describeExecError(error), version: null };
  }
};

const readOpenCodeSdkVersion = async (): Promise<PackageVersionResult> => {
  const [installed, latest] = await Promise.all([
    readBundledPackageVersion(PACKAGE_MAP.glmOpenCode.sdk),
    readLatestVersion(PACKAGE_MAP.glmOpenCode.sdk),
  ]);
  return {
    currentVersion: installed.version,
    error: combineErrors(installed.error, latest.error),
    latestVersion: latest.version,
    packageName: PACKAGE_MAP.glmOpenCode.sdk,
  };
};

const installGlobalPackageLatest = async (
  packageName: string
): Promise<void> => {
  await execAsync(`${NPM_COMMAND} install -g ${packageName}@latest`, {
    maxBuffer: EXEC_MAX_BUFFER_BYTES,
  });
};

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

const resolveDescriptors = (): PackageDescriptor[] =>
  (
    Object.entries(PACKAGE_MAP) as [
      ProviderId,
      Partial<Record<VersionTarget, string>>,
    ][]
  ).flatMap(([provider, targets]) =>
    (Object.entries(targets) as [VersionTarget, string][]).map(
      ([target, packageName]) => ({
        packageName,
        provider,
        target,
      })
    )
  );

const toVersionEntry = (result: PackageVersionResult): VersionEntry => ({
  currentVersion: result.currentVersion,
  error: result.error ?? null,
  latestVersion: result.latestVersion,
  packageName: result.packageName,
  source: "global",
});

const buildSnapshot = (
  results: readonly PackageVersionResult[]
): SettingsProviderVersionsSnapshot => {
  const get = (provider: ProviderId, target: VersionTarget): VersionEntry => {
    const packageName = resolvePackageName(provider, target);
    const match = results.find((result) => result.packageName === packageName);
    return match
      ? toVersionEntry(match)
      : {
          currentVersion: null,
          error: "Version information unavailable",
          latestVersion: null,
          packageName,
          source: "global",
        };
  };

  return {
    checkedAt: new Date().toISOString(),
    claude: {
      cli: get("claude", "cli"),
      sdk: get("claude", "sdk"),
    },
    codex: {
      cli: get("codex", "cli"),
      sdk: get("codex", "sdk"),
    },
    glmOpenCode: {
      cli: get("glmOpenCode", "cli"),
      sdk: get("glmOpenCode", "sdk"),
    },
  };
};

export class SettingsProviderVersionService {
  async loadSnapshot(): Promise<SettingsProviderVersionsSnapshot> {
    const descriptors = resolveDescriptors();

    const results = await Promise.all(
      descriptors.map(async ({ packageName, provider, target }) => {
        if (provider === "glmOpenCode" && target === "cli") {
          return readOpenCodeVersion();
        }
        if (provider === "glmOpenCode" && target === "sdk") {
          return readOpenCodeSdkVersion();
        }
        const installed = await readInstalledVersion(packageName);
        const latest = await readLatestVersion(packageName);
        return {
          currentVersion: installed.version,
          error: installed.error ?? latest.error,
          latestVersion: latest.version,
          packageName,
        } satisfies PackageVersionResult;
      })
    );

    return buildSnapshot(results);
  }

  async updateTarget(
    provider: ProviderId,
    target: VersionTarget
  ): Promise<SettingsProviderVersionsSnapshot> {
    if (provider === "glmOpenCode") {
      throw new Error("OpenCode CLI updates are managed outside CodeAI Hub.");
    }
    await installGlobalPackageLatest(resolvePackageName(provider, target));
    return this.loadSnapshot();
  }
}
