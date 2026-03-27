import type {
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
} from "@codeai-hub/claude-module";
import { ProviderUsageLimitsFacade } from "../provider-usage-limits/provider-usage-limits-facade";
import { buildProviderUsageLimitScopeKey } from "../provider-usage-limits/provider-usage-limits-scope-key";
import { ClaudeUsageLimitsFacade } from "../provider-usage-limits/providers/claude/claude-usage-limits-facade";
import { CodexUsageLimitsFacade } from "../provider-usage-limits/providers/codex/codex-usage-limits-facade";
import { GeminiUsageLimitsFacade } from "../provider-usage-limits/providers/gemini/gemini-usage-limits-facade";
import type {
  GeminiUsageLimitsFacadeBridge,
  GeminiUsageLimitsStreamPayload,
} from "./provider-module-loader.types";

type CoreClaudeUsageLimitsStreamPayload = NonNullable<
  ReturnType<ProviderUsageLimitsFacade["getCachedStreamPayload"]>
>;

const CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY =
  "CODEAI_CLAUDE_RATE_LIMIT_INFO_PAYLOAD";

const mergeCoreClaudeUsageLimitsPayloads = (
  runtimePayload: CoreClaudeUsageLimitsStreamPayload | null,
  fallbackPayload: ReturnType<
    ProviderUsageLimitsFacade["getCachedStreamPayload"]
  >
): CoreClaudeUsageLimitsStreamPayload | null => {
  if (!runtimePayload) {
    return fallbackPayload;
  }
  if (!fallbackPayload) {
    return runtimePayload;
  }

  const usageLimits = {
    currentSession:
      runtimePayload.usageLimits?.currentSession ??
      fallbackPayload.usageLimits?.currentSession ??
      null,
    currentWeekAllModels:
      runtimePayload.usageLimits?.currentWeekAllModels ??
      fallbackPayload.usageLimits?.currentWeekAllModels ??
      null,
    currentWeekSonnetOnly:
      runtimePayload.usageLimits?.currentWeekSonnetOnly ??
      fallbackPayload.usageLimits?.currentWeekSonnetOnly ??
      null,
  };

  return {
    providerScopeKey: runtimePayload.providerScopeKey,
    usageLimits,
    data: {
      ...runtimePayload.data,
      usageLimits,
    },
  };
};

const toClaudeUsageLimitsStreamPayload = (
  payload: ReturnType<ProviderUsageLimitsFacade["getCachedStreamPayload"]>
): ClaudeUsageLimitsStreamPayload | null => {
  if (!payload) {
    return null;
  }

  const usageLimits = payload.usageLimits
    ? {
        currentSession: payload.usageLimits.currentSession ?? null,
        currentWeekAllModels: payload.usageLimits.currentWeekAllModels ?? null,
        currentWeekSonnetOnly:
          payload.usageLimits.currentWeekSonnetOnly ?? null,
      }
    : null;

  return {
    providerScopeKey: payload.providerScopeKey,
    usageLimits,
    data: {
      ...payload.data,
      usageLimits,
    },
  };
};

const toCodexUsageLimitsStreamPayload = (
  payload: ReturnType<ProviderUsageLimitsFacade["getCachedStreamPayload"]>
) => {
  if (!payload) {
    return null;
  }

  const usageLimits = payload.usageLimits
    ? {
        currentSession: payload.usageLimits.currentSession ?? null,
        currentWeekAllModels: payload.usageLimits.currentWeekAllModels ?? null,
        currentWeekSonnetOnly:
          payload.usageLimits.currentWeekSonnetOnly ?? null,
      }
    : null;

  return {
    providerScopeKey: payload.providerScopeKey,
    usageLimits,
    data: {
      ...payload.data,
      usageLimits,
    },
  };
};

const toGeminiUsageLimitsStreamPayload = (
  payload: ReturnType<ProviderUsageLimitsFacade["getCachedStreamPayload"]>
): GeminiUsageLimitsStreamPayload | null => {
  if (!payload) {
    return null;
  }

  const usageLimits = payload.usageLimits
    ? {
        currentSession: payload.usageLimits.currentSession ?? null,
        currentWeekAllModels: payload.usageLimits.currentWeekAllModels ?? null,
        currentWeekSonnetOnly:
          payload.usageLimits.currentWeekSonnetOnly ?? null,
      }
    : null;

  return {
    providerScopeKey: payload.providerScopeKey,
    usageLimits,
    data: {
      ...payload.data,
      usageLimits,
    },
  };
};

export const createClaudeUsageLimitsFacadeBridge =
  (): ClaudeUsageLimitsFacadeBridge => {
    const sourceFacade = new ClaudeUsageLimitsFacade();
    const sharedFacade = new ProviderUsageLimitsFacade({
      readers: {
        claude: {
          read: async (params) => await sourceFacade.read(params),
        },
      },
    });
    const runtimePayloadCache = new Map<
      string,
      CoreClaudeUsageLimitsStreamPayload
    >();

    const getCachedCorePayload = (
      providerSessionId: string | null
    ): CoreClaudeUsageLimitsStreamPayload | null => {
      const scopeKey = buildProviderUsageLimitScopeKey({
        providerId: "claude",
        providerSessionId,
      });
      return mergeCoreClaudeUsageLimitsPayloads(
        runtimePayloadCache.get(scopeKey) ?? null,
        sharedFacade.getCachedStreamPayload({
          providerId: "claude",
          providerSessionId,
        })
      );
    };

    const readRuntimePayload = (
      params: Parameters<ClaudeUsageLimitsFacadeBridge["readStreamPayload"]>[0]
    ): CoreClaudeUsageLimitsStreamPayload | null => {
      const raw =
        params.environment?.[CLAUDE_RUNTIME_RATE_LIMIT_INFO_ENV_KEY]?.trim();
      if (!raw) {
        return null;
      }

      try {
        const runtimePayload =
          sourceFacade.readStreamPayloadFromRuntimeRateLimit({
            providerSessionId: params.providerSessionId,
            previousUsageLimits:
              getCachedCorePayload(params.providerSessionId)?.usageLimits ??
              null,
            runtimePayload: JSON.parse(raw),
          });
        if (!runtimePayload) {
          return null;
        }
        runtimePayloadCache.set(
          runtimePayload.providerScopeKey,
          runtimePayload
        );
        return getCachedCorePayload(params.providerSessionId);
      } catch {
        return null;
      }
    };

    return {
      readStreamPayload: async (params) => {
        const runtimePayload = readRuntimePayload(params);
        if (runtimePayload) {
          return toClaudeUsageLimitsStreamPayload(runtimePayload);
        }

        return toClaudeUsageLimitsStreamPayload(
          await sharedFacade.readStreamPayload({
            ...params,
            providerId: "claude",
          })
        );
      },
      getCachedStreamPayload: (params) =>
        toClaudeUsageLimitsStreamPayload(
          getCachedCorePayload(params.providerSessionId)
        ),
    };
  };

export const createCodexUsageLimitsFacadeBridge = () => {
  const sourceFacade = new CodexUsageLimitsFacade();
  const sharedFacade = new ProviderUsageLimitsFacade({
    readers: {
      codex: {
        read: async (params) => await sourceFacade.read(params),
      },
    },
  });

  return {
    readStreamPayload: async (params: {
      readonly workspacePath: string;
      readonly runtimeSessionId: string;
      readonly providerSessionId: string | null;
      readonly environment?: NodeJS.ProcessEnv;
      readonly force?: boolean;
    }) =>
      toCodexUsageLimitsStreamPayload(
        await sharedFacade.readStreamPayload({
          ...params,
          providerId: "codex",
        })
      ),
    getCachedStreamPayload: (params: {
      readonly providerSessionId: string | null;
    }) =>
      toCodexUsageLimitsStreamPayload(
        sharedFacade.getCachedStreamPayload({
          providerId: "codex",
          providerSessionId: params.providerSessionId,
        })
      ),
  };
};

export const createGeminiUsageLimitsFacadeBridge =
  (): GeminiUsageLimitsFacadeBridge => {
    const sourceFacade = new GeminiUsageLimitsFacade();
    const sharedFacade = new ProviderUsageLimitsFacade({
      readers: {
        gemini: {
          read: async (params) => await sourceFacade.read(params),
        },
      },
    });

    return {
      readStreamPayload: async (params) =>
        toGeminiUsageLimitsStreamPayload(
          await sharedFacade.readStreamPayload({
            ...params,
            providerId: "gemini",
          })
        ),
      getCachedStreamPayload: (params) =>
        toGeminiUsageLimitsStreamPayload(
          sharedFacade.getCachedStreamPayload({
            providerId: "gemini",
            providerSessionId: params.providerSessionId,
          })
        ),
    };
  };
