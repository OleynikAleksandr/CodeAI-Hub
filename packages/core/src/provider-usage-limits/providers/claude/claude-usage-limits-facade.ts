import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import { buildProviderUsageLimitsStreamPayload } from "../../provider-usage-limits-stream-event";
import type {
  CompatibleSessionUsageLimits,
  ProviderUsageLimitBucket,
  ProviderUsageLimitSource,
  ProviderUsageLimitsSnapshot,
  ProviderUsageLimitsStreamPayload,
  ProviderUsageLimitWindow,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  ClaudeLiveHeadersReader,
  type ClaudeLiveHeadersSnapshot,
  type ClaudeOAuthTokenResolver,
} from "./claude-live-headers-reader";
import { ClaudeUsageLimitsNormalizer } from "./claude-usage-limits-normalizer";

const execFileAsync = promisify(execFile);

const CLAUDE_OAUTH_ENV_KEY = "CLAUDE_CODE_OAUTH_TOKEN";
const CLAUDE_OAUTH_STORE_SERVICE = "Claude Code-credentials";
const CLAUDE_CREDENTIALS_FILENAME = ".credentials.json";
const DEFAULT_CODEAI_CLAUDE_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "claude",
  "home"
);
const MAC_SECURITY = "/usr/bin/security";
const WINDOWS_POWERSHELL = "powershell.exe";
const TOKEN_FIELD_CANDIDATES = [
  "accessToken",
  "access_token",
  "oauthToken",
  "oauth_token",
  "token",
] as const;
const WHITESPACE_PATTERN = /\s/;
const LINUX_SECRET_LOOKUP_QUERIES: ReadonlyArray<readonly string[]> = [
  ["service", CLAUDE_OAUTH_STORE_SERVICE],
  ["application", CLAUDE_OAUTH_STORE_SERVICE],
  ["target", CLAUDE_OAUTH_STORE_SERVICE],
];
const WINDOWS_CREDENTIAL_TARGETS = [
  CLAUDE_OAUTH_STORE_SERVICE,
  "Claude Code Credentials",
] as const;

type ClaudeUsageLimitSource = Extract<
  ProviderUsageLimitSource,
  "claude_headers" | "claude_probe"
>;
type ClaudeRuntimeRateLimitType =
  | "five_hour"
  | "seven_day"
  | "seven_day_sonnet";

export interface ClaudeUsageLimitsFacadeOptions {
  readonly headersReader?: ClaudeLiveHeadersReader;
  readonly normalizer?: ClaudeUsageLimitsNormalizer;
  readonly oauthTokenResolver?: ClaudeOAuthTokenResolver;
}

export interface ClaudeUsageHeadersInput {
  readonly collectedAt?: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly providerSessionId: string | null;
  readonly source?: ClaudeUsageLimitSource;
}
export interface ClaudeRuntimeRateLimitPayload {
  readonly collectedAt?: string;
  readonly rate_limit_info?: unknown;
  readonly rateLimitInfo?: unknown;
}

const isLikelyRawToken = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 24 && !WHITESPACE_PATTERN.test(trimmed);
};

const extractTokenFromCredentialPayload = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  for (const field of TOKEN_FIELD_CANDIDATES) {
    const candidate = record[field];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  for (const nestedValue of Object.values(record)) {
    const token = extractTokenFromCredentialPayload(nestedValue);
    if (token) {
      return token;
    }
  }

  return null;
};

const extractTokenFromRawPayload = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return extractTokenFromCredentialPayload(parsed) ?? null;
  } catch {
    return isLikelyRawToken(trimmed) ? trimmed : null;
  }
};

const readTokenFromCredentialsFile = async (
  filePath: string
): Promise<string | null> => {
  try {
    return extractTokenFromRawPayload(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
};

const runCommandForToken = async (
  command: string,
  args: readonly string[]
): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync(command, args, {
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return extractTokenFromRawPayload(stdout);
  } catch {
    return null;
  }
};

const buildWindowsCredentialReadScript = (): string => {
  const escapedTargets = WINDOWS_CREDENTIAL_TARGETS.map(
    (target) => `'${target.replace(/'/g, "''")}'`
  );
  return [
    "$ErrorActionPreference='SilentlyContinue'",
    "if (-not (Get-Command Get-StoredCredential -ErrorAction SilentlyContinue)) { exit 0 }",
    `$targets=@(${escapedTargets.join(",")})`,
    "foreach ($target in $targets) {",
    "  $credential=Get-StoredCredential -Target $target",
    "  if ($credential -and $credential.Password) {",
    "    Write-Output $credential.Password",
    "    exit 0",
    "  }",
    "}",
    "exit 0",
  ].join(";");
};

const readTokenFromPlatformStore = async (): Promise<string | null> => {
  if (process.platform === "darwin") {
    return await runCommandForToken(MAC_SECURITY, [
      "find-generic-password",
      "-s",
      CLAUDE_OAUTH_STORE_SERVICE,
      "-w",
    ]);
  }

  if (process.platform === "linux") {
    for (const query of LINUX_SECRET_LOOKUP_QUERIES) {
      const token = await runCommandForToken("secret-tool", [
        "lookup",
        ...query,
      ]);
      if (token) {
        return token;
      }
    }
    return null;
  }

  if (process.platform === "win32") {
    return await runCommandForToken(WINDOWS_POWERSHELL, [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      buildWindowsCredentialReadScript(),
    ]);
  }

  return null;
};

const resolveClaudeCredentialsPaths = (): readonly string[] => {
  const claudeHome =
    process.env.CODEAI_CLAUDE_HOME?.trim() || DEFAULT_CODEAI_CLAUDE_HOME;
  return [
    path.join(claudeHome, ".claude", CLAUDE_CREDENTIALS_FILENAME),
    path.join(homedir(), ".claude", CLAUDE_CREDENTIALS_FILENAME),
  ];
};

const resolveClaudeOAuthToken: ClaudeOAuthTokenResolver = async (
  environment
) => {
  const fromEnvironment = environment?.[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromEnvironment) {
    return fromEnvironment;
  }

  const fromProcessEnvironment = process.env[CLAUDE_OAUTH_ENV_KEY]?.trim();
  if (fromProcessEnvironment) {
    return fromProcessEnvironment;
  }

  for (const filePath of resolveClaudeCredentialsPaths()) {
    const token = await readTokenFromCredentialsFile(filePath);
    if (token) {
      return token;
    }
  }

  return await readTokenFromPlatformStore();
};
const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const normalizeRuntimeResetsAt = (value: unknown): string | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const timestampMs = value >= 1_000_000_000_000 ? value : value * 1000;
  const parsedDate = new Date(timestampMs);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
};

const normalizeRuntimeBucket = (
  value: unknown
): {
  readonly bucket: ProviderUsageLimitBucket;
  readonly rateLimitType: ClaudeRuntimeRateLimitType;
} | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rateLimitType = record.rateLimitType;
  if (
    rateLimitType !== "five_hour" &&
    rateLimitType !== "seven_day" &&
    rateLimitType !== "seven_day_sonnet"
  ) {
    return null;
  }

  let utilization: number | null = null;
  if (
    typeof record.utilization === "number" &&
    Number.isFinite(record.utilization)
  ) {
    utilization =
      record.utilization <= 1 ? record.utilization * 100 : record.utilization;
  } else if (record.status === "rejected") {
    utilization = 100;
  }
  if (utilization === null) {
    return null;
  }

  return {
    bucket: {
      percentUsed: clampPercent(utilization),
      resetsAt: normalizeRuntimeResetsAt(record.resetsAt),
    },
    rateLimitType,
  };
};

export class ClaudeUsageLimitsFacade {
  readonly #headersReader: ClaudeLiveHeadersReader;
  readonly #normalizer: ClaudeUsageLimitsNormalizer;

  constructor(options: ClaudeUsageLimitsFacadeOptions = {}) {
    this.#headersReader =
      options.headersReader ??
      new ClaudeLiveHeadersReader({
        resolveOAuthToken:
          options.oauthTokenResolver ?? resolveClaudeOAuthToken,
      });
    this.#normalizer = options.normalizer ?? new ClaudeUsageLimitsNormalizer();
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "claude") {
      return null;
    }

    const headerSnapshot = await this.#headersReader.read(params);
    return headerSnapshot
      ? this.#normalizeSnapshot(params.providerSessionId, headerSnapshot)
      : null;
  }

  normalizeHeaders(
    input: ClaudeUsageHeadersInput
  ): ProviderUsageLimitsSnapshot | null {
    return this.#normalizer.normalize({
      collectedAt: input.collectedAt,
      headers: input.headers,
      providerScopeKey: this.#buildScopeKey(input.providerSessionId),
      source: input.source ?? "claude_headers",
    });
  }

  readStreamPayloadFromRuntimeRateLimit(input: {
    readonly previousUsageLimits?: CompatibleSessionUsageLimits;
    readonly providerSessionId: string | null;
    readonly runtimePayload: ClaudeRuntimeRateLimitPayload;
  }): ProviderUsageLimitsStreamPayload | null {
    const runtimeBucket = normalizeRuntimeBucket(
      input.runtimePayload.rateLimitInfo ?? input.runtimePayload.rate_limit_info
    );
    if (!runtimeBucket) {
      return null;
    }

    const usageLimits = {
      currentSession: input.previousUsageLimits?.currentSession ?? null,
      currentWeekAllModels:
        input.previousUsageLimits?.currentWeekAllModels ?? null,
      currentWeekSonnetOnly:
        input.previousUsageLimits?.currentWeekSonnetOnly ?? null,
    };

    if (runtimeBucket.rateLimitType === "five_hour") {
      usageLimits.currentSession = runtimeBucket.bucket;
    }
    if (runtimeBucket.rateLimitType === "seven_day") {
      usageLimits.currentWeekAllModels = runtimeBucket.bucket;
    }
    if (runtimeBucket.rateLimitType === "seven_day_sonnet") {
      usageLimits.currentWeekSonnetOnly = runtimeBucket.bucket;
    }

    const snapshot = this.#buildRuntimeSnapshot(
      input.providerSessionId,
      usageLimits,
      input.runtimePayload.collectedAt
    );
    return snapshot
      ? buildProviderUsageLimitsStreamPayload({
          snapshot,
          compat: usageLimits,
        })
      : null;
  }

  #normalizeSnapshot(
    providerSessionId: string | null,
    snapshot: ClaudeLiveHeadersSnapshot
  ): ProviderUsageLimitsSnapshot | null {
    return this.#normalizer.normalize({
      collectedAt: snapshot.collectedAt,
      headers: snapshot.headers,
      providerScopeKey: this.#buildScopeKey(providerSessionId),
      source: snapshot.source,
    });
  }

  #buildRuntimeSnapshot(
    providerSessionId: string | null,
    usageLimits: NonNullable<CompatibleSessionUsageLimits>,
    collectedAt?: string
  ): ProviderUsageLimitsSnapshot | null {
    const windows: Array<ProviderUsageLimitWindow | null> = [
      usageLimits.currentSession
        ? {
            id: "primary" as const,
            label: "Session",
            percentUsed: usageLimits.currentSession.percentUsed,
            resetsAt: usageLimits.currentSession.resetsAt,
            windowKind: "session" as const,
          }
        : null,
      usageLimits.currentWeekAllModels
        ? {
            id: "secondary" as const,
            label: "Weekly",
            percentUsed: usageLimits.currentWeekAllModels.percentUsed,
            resetsAt: usageLimits.currentWeekAllModels.resetsAt,
            windowKind: "weekly" as const,
          }
        : null,
      usageLimits.currentWeekSonnetOnly
        ? {
            id: "tertiary" as const,
            label: "Sonnet Weekly",
            percentUsed: usageLimits.currentWeekSonnetOnly.percentUsed,
            resetsAt: usageLimits.currentWeekSonnetOnly.resetsAt,
            windowKind: "model-weekly" as const,
          }
        : null,
    ];
    const normalizedWindows = windows.filter(
      (window): window is ProviderUsageLimitWindow => window !== null
    );
    if (normalizedWindows.length === 0) {
      return null;
    }

    return {
      collectedAt: collectedAt ?? new Date().toISOString(),
      providerId: "claude",
      providerScopeKey: this.#buildScopeKey(providerSessionId),
      source: "claude_headers",
      windows: normalizedWindows,
    };
  }

  #buildScopeKey(providerSessionId: string | null): string {
    return buildProviderUsageLimitScopeKey({
      providerId: "claude",
      providerSessionId,
    });
  }
}

export const createClaudeUsageLimitsReader = (
  facade: ClaudeUsageLimitsFacade = new ClaudeUsageLimitsFacade()
): {
  read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null>;
} => ({
  read: async (params) => await facade.read(params),
});
