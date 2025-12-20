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
    cli: "@google/gemini-cli",
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
    readonly cli: VersionEntry;
    readonly core: VersionEntry;
  };
  readonly checkedAt: string;
};

export type PackageVersionResult = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly error?: string;
};

export type PackageDescriptor = {
  readonly provider: ProviderId;
  readonly target: VersionTarget;
  readonly packageName: string;
};

const nowIso = (): string => new Date().toISOString();

export const resolvePackageName = (
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

export const resolveDescriptors = (): PackageDescriptor[] =>
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

const toVersionEntry = (result: PackageVersionResult): VersionEntry => ({
  packageName: result.packageName,
  currentVersion: result.currentVersion,
  latestVersion: result.latestVersion,
  source: "global",
  error: result.error ?? null,
});

export const buildSnapshot = (
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
      cli: get("gemini", "cli"),
      core: get("gemini", "core"),
    },
    checkedAt: nowIso(),
  };
};
