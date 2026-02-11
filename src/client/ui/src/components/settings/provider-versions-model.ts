export type VersionEntry = {
  readonly packageName: string;
  readonly currentVersion: string | null;
  readonly latestVersion: string | null;
  readonly source: "global";
  readonly error?: string | null;
};

export type ProviderVersions = {
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
  readonly checkedAt?: string;
};
