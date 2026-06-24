export const PACKAGE_MAP = {
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
  },
} as const;

export type ProviderId = keyof typeof PACKAGE_MAP;
export type VersionTarget = "cli" | "sdk" | "core";

export interface VersionEntry {
  readonly currentVersion: string | null;
  readonly error?: string | null;
  readonly latestVersion: string | null;
  readonly packageName: string;
  readonly source: "global";
}

export interface ProviderVersionsSnapshot {
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
  };
}

export interface PackageVersionResult {
  readonly currentVersion: string | null;
  readonly error?: string;
  readonly latestVersion: string | null;
  readonly packageName: string;
}

export interface PackageDescriptor {
  readonly packageName: string;
  readonly provider: ProviderId;
  readonly target: VersionTarget;
}

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
    glmOpenCode: {
      cli: get("glmOpenCode", "cli"),
    },
    checkedAt: nowIso(),
  };
};
