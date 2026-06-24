export interface VersionEntry {
  readonly currentVersion: string | null;
  readonly error?: string | null;
  readonly latestVersion: string | null;
  readonly packageName: string;
  readonly source: "global";
}

export interface ProviderVersions {
  readonly checkedAt?: string;
  readonly claude: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly codex: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
  readonly glmOpenCode?: {
    readonly cli: VersionEntry;
    readonly sdk: VersionEntry;
  };
}
