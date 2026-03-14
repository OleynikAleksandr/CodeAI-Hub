import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildProviderUsageLimitScopeKey } from "../../provider-usage-limits-scope-key";
import type {
  ProviderUsageLimitsSnapshot,
  ReadProviderUsageLimitsParams,
} from "../../provider-usage-limits-types";
import {
  type GeminiQuotaApiBucket,
  GeminiUsageLimitsNormalizer,
} from "./gemini-usage-limits-normalizer";

const requireModule = createRequire(__filename);

const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const CODEAI_HUB_GEMINI_CLI_ROOT_ENV_KEY = "CODEAI_HUB_GEMINI_CLI_ROOT";
const CODEAI_HUB_GEMINI_CLI_CORE_ROOT_ENV_KEY =
  "CODEAI_HUB_GEMINI_CLI_CORE_ROOT";
const DEFAULT_INCLUDE_DIRECTORY = path.join(
  homedir(),
  ".codeai-hub",
  "templates"
);
const DEFAULT_GEMINI_CLI_ROOT = path.join(
  homedir(),
  ".npm-global",
  "lib",
  "node_modules",
  "@google",
  "gemini-cli"
);
const DEFAULT_GEMINI_CLI_CORE_ROOT = path.join(
  homedir(),
  ".npm-global",
  "lib",
  "node_modules",
  "@google",
  "gemini-cli-core"
);

type GeminiMergedSettings = {
  readonly security?: {
    readonly auth?: {
      readonly selectedType?: string;
    };
  };
};

type GeminiLoadedSettings = { readonly merged: GeminiMergedSettings };
type GeminiSettingsModule = {
  loadSettings(workspacePath: string): GeminiLoadedSettings;
};

type GeminiQuotaConfig = {
  refreshAuth(authType: string): Promise<void>;
  initialize(): Promise<void>;
  refreshUserQuota?(): Promise<unknown>;
  getLastRetrievedQuota?(): unknown;
  getActiveModel?(): string;
};

type GeminiConfigModule = {
  loadCliConfig(
    settings: GeminiMergedSettings,
    sessionId: string,
    argv: Record<string, unknown>,
    options?: {
      readonly cwd?: string;
    }
  ): Promise<GeminiQuotaConfig>;
};

type GeminiContentModule = {
  readonly AuthType: {
    readonly LOGIN_WITH_GOOGLE: string;
    readonly COMPUTE_ADC: string;
  };
};

type GeminiQuotaModules = {
  readonly config: GeminiConfigModule;
  readonly settings: GeminiSettingsModule;
  readonly content: GeminiContentModule;
};

const dynamicImportModule = <T>(specifier: string): Promise<T> =>
  Function("specifier", "return import(specifier);")(specifier) as Promise<T>;

const resolvePackageRoot = (
  packageName: string,
  envKey: string,
  fallbackCandidates: readonly string[]
): string => {
  const candidates = [
    process.env[envKey]?.trim(),
    ...fallbackCandidates,
    path.join(process.cwd(), "node_modules", ...packageName.split("/")),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const normalized = path.resolve(candidate);
    if (existsSync(path.join(normalized, "package.json"))) {
      return normalized;
    }
  }

  try {
    return path.dirname(requireModule.resolve(`${packageName}/package.json`));
  } catch {
    throw new Error(
      `Unable to locate ${packageName}. Install it or set ${envKey}.`
    );
  }
};

const loadModuleFromCandidates = async <T>(
  root: string,
  candidates: readonly (readonly string[])[]
): Promise<T> => {
  for (const segments of candidates) {
    try {
      return await dynamicImportModule<T>(
        pathToFileURL(path.join(root, ...segments)).href
      );
    } catch {
      // Try the next package layout candidate.
    }
  }

  throw new Error(`Unable to load module from ${root}`);
};

const buildCliArgv = (workspacePath: string): Record<string, unknown> => ({
  query: undefined,
  model: undefined,
  sandbox: undefined,
  debug: false,
  prompt: undefined,
  promptInteractive: undefined,
  yolo: true,
  approvalMode: "yolo",
  allowedMcpServerNames: undefined,
  allowedTools: undefined,
  experimentalAcp: false,
  extensions: undefined,
  listExtensions: false,
  resume: undefined,
  listSessions: false,
  deleteSession: undefined,
  includeDirectories: Array.from(
    new Set(
      [DEFAULT_INCLUDE_DIRECTORY, workspacePath].map((directory) =>
        path.resolve(directory)
      )
    )
  ),
  screenReader: undefined,
  useSmartEdit: undefined,
  useWriteTodos: undefined,
  outputFormat: "json",
  fakeResponses: undefined,
  recordResponses: undefined,
});

const resolveAuthType = (
  settings: GeminiLoadedSettings,
  content: GeminiContentModule
): string =>
  settings.merged.security?.auth?.selectedType?.trim() ||
  content.AuthType.LOGIN_WITH_GOOGLE;

const supportsQuotaApi = (
  authType: string,
  content: GeminiContentModule
): boolean =>
  authType === content.AuthType.LOGIN_WITH_GOOGLE ||
  authType === content.AuthType.COMPUTE_ADC;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractQuotaBuckets = (
  value: unknown
): readonly GeminiQuotaApiBucket[] | null =>
  isRecord(value) && Array.isArray(value.buckets)
    ? (value.buckets as readonly GeminiQuotaApiBucket[])
    : null;

let modulesPromise: Promise<GeminiQuotaModules> | null = null;

const loadGeminiQuotaModules = (): Promise<GeminiQuotaModules> => {
  if (modulesPromise) {
    return modulesPromise;
  }

  modulesPromise = (async () => {
    const cliRoot = resolvePackageRoot(
      GEMINI_CLI_PACKAGE,
      CODEAI_HUB_GEMINI_CLI_ROOT_ENV_KEY,
      [DEFAULT_GEMINI_CLI_ROOT]
    );
    const cliCoreRoot = resolvePackageRoot(
      GEMINI_CLI_CORE_PACKAGE,
      CODEAI_HUB_GEMINI_CLI_CORE_ROOT_ENV_KEY,
      [
        path.join(path.dirname(cliRoot), "gemini-cli-core"),
        DEFAULT_GEMINI_CLI_CORE_ROOT,
      ]
    );

    const [config, settings, content] = await Promise.all([
      loadModuleFromCandidates<GeminiConfigModule>(cliRoot, [
        ["dist", "src", "config", "config.js"],
        ["dist", "config", "config.js"],
      ]),
      loadModuleFromCandidates<GeminiSettingsModule>(cliRoot, [
        ["dist", "src", "config", "settings.js"],
        ["dist", "config", "settings.js"],
      ]),
      loadModuleFromCandidates<GeminiContentModule>(cliCoreRoot, [
        ["dist", "src", "core", "contentGenerator.js"],
        ["dist", "core", "contentGenerator.js"],
      ]),
    ]);

    return {
      config,
      settings,
      content,
    };
  })();

  return modulesPromise;
};

export type GeminiQuotaApiUsageLimitsReaderOptions = {
  readonly normalizer?: GeminiUsageLimitsNormalizer;
};

export class GeminiQuotaApiUsageLimitsReader {
  readonly #normalizer: GeminiUsageLimitsNormalizer;

  constructor(options: GeminiQuotaApiUsageLimitsReaderOptions = {}) {
    this.#normalizer = options.normalizer ?? new GeminiUsageLimitsNormalizer();
  }

  async read(
    params: ReadProviderUsageLimitsParams
  ): Promise<ProviderUsageLimitsSnapshot | null> {
    if (params.providerId !== "gemini") {
      return null;
    }

    const modules = await loadGeminiQuotaModules();
    const settings = modules.settings.loadSettings(params.workspacePath);
    const authType = resolveAuthType(settings, modules.content);
    if (!supportsQuotaApi(authType, modules.content)) {
      return null;
    }

    const sessionId =
      params.providerSessionId?.trim() || params.runtimeSessionId.trim();
    const config = await modules.config.loadCliConfig(
      settings.merged,
      sessionId,
      buildCliArgv(params.workspacePath),
      { cwd: params.workspacePath }
    );

    await config.refreshAuth(authType);
    await config.initialize();

    const refreshedQuota =
      typeof config.refreshUserQuota === "function"
        ? await config.refreshUserQuota()
        : null;
    const quotaBuckets =
      extractQuotaBuckets(refreshedQuota) ??
      extractQuotaBuckets(
        typeof config.getLastRetrievedQuota === "function"
          ? config.getLastRetrievedQuota()
          : null
      );
    if (!quotaBuckets?.length) {
      return null;
    }

    return this.#normalizer.normalize({
      providerScopeKey: buildProviderUsageLimitScopeKey({
        providerId: "gemini",
        providerSessionId: params.providerSessionId,
      }),
      snapshot: {
        activeModel:
          typeof config.getActiveModel === "function"
            ? config.getActiveModel()
            : null,
        buckets: quotaBuckets,
        collectedAt: new Date().toISOString(),
      },
      source: "gemini_quota_api",
    });
  }
}
