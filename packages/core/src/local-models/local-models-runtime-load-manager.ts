import type { LmsCommandRunner } from "./local-models-cli";
import type { LocalModelDescriptor } from "./local-models-facade";

export type LocalModelRuntimePurpose =
  | "translation-reasoning"
  | "translation-localization"
  | "translation-generic"
  | "workflow-agent";

interface LoadedLmStudioModelRecord {
  readonly contextLength?: unknown;
  readonly identifier?: unknown;
  readonly modelKey?: unknown;
  readonly status?: unknown;
  readonly type?: unknown;
}

interface LocalModelsRuntimeLoadManagerOptions {
  readonly commandRunner: LmsCommandRunner;
  readonly modelLoadTimeoutMs?: number;
}

interface EnsureLocalModelLoadedOptions {
  readonly maxTokens?: number;
  readonly model: LocalModelDescriptor;
  readonly persistent?: boolean;
  readonly preserveOtherCodeAiWorkers?: boolean;
  readonly purpose: LocalModelRuntimePurpose;
  readonly sourceTextLength?: number;
}

const CODEAI_IDENTIFIER_PREFIX = "codeaihub";
const DEFAULT_MODEL_LOAD_TIMEOUT_MS = 120_000;
const DEFAULT_REASONING_CONTEXT_LENGTH = 8192;
const DEFAULT_GENERIC_TRANSLATION_CONTEXT_LENGTH = 16_384;
const DEFAULT_LOCALIZATION_CONTEXT_CAP = 32_768;
const DEFAULT_AGENT_CONTEXT_LENGTH = 8192;
const DEFAULT_GENERIC_TRANSLATION_TTL_SECONDS = 300;
const DEFAULT_LOCALIZATION_TTL_SECONDS = 300;
const DEFAULT_REASONING_TTL_SECONDS = 600;
const DEFAULT_AGENT_TTL_SECONDS = 1800;
const DEFAULT_RESPONSE_TOKEN_BUDGET = 4096;
const ESTIMATED_PROMPT_OVERHEAD_TOKENS = 1200;
const ESTIMATED_CHARS_PER_TOKEN = 3;
const LM_STUDIO_IDENTIFIER_SAFE_PATTERN = /[^a-zA-Z0-9._-]+/gu;

const parsePositiveInteger = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const clampToModelContext = (
  requested: number,
  model: LocalModelDescriptor
): number =>
  typeof model.maxContextLength === "number"
    ? Math.min(requested, model.maxContextLength)
    : requested;

const roundUpToContextTier = (requested: number): number => {
  for (const tier of [8192, 16_384, 32_768] as const) {
    if (requested <= tier) {
      return tier;
    }
  }
  return requested;
};

const estimateRequiredTranslationContext = (
  sourceTextLength: number,
  maxTokens: number
): number =>
  roundUpToContextTier(
    Math.ceil(sourceTextLength / ESTIMATED_CHARS_PER_TOKEN) +
      maxTokens +
      ESTIMATED_PROMPT_OVERHEAD_TOKENS
  );

const resolveRequestedContextLength = (
  options: EnsureLocalModelLoadedOptions
): number => {
  const legacyOverride = parsePositiveInteger(
    process.env.CODEAI_LMSTUDIO_CONTEXT_LENGTH
  );
  if (legacyOverride) {
    return clampToModelContext(legacyOverride, options.model);
  }

  if (options.purpose === "workflow-agent") {
    const requested =
      parsePositiveInteger(process.env.CODEAI_LMSTUDIO_AGENT_CONTEXT_LENGTH) ??
      DEFAULT_AGENT_CONTEXT_LENGTH;
    return clampToModelContext(requested, options.model);
  }

  if (options.purpose === "translation-reasoning") {
    const requested =
      parsePositiveInteger(
        process.env.CODEAI_LMSTUDIO_REASONING_CONTEXT_LENGTH
      ) ?? DEFAULT_REASONING_CONTEXT_LENGTH;
    return clampToModelContext(requested, options.model);
  }

  if (options.purpose === "translation-localization") {
    const cap =
      parsePositiveInteger(
        process.env.CODEAI_LMSTUDIO_LOCALIZATION_CONTEXT_LENGTH
      ) ?? DEFAULT_LOCALIZATION_CONTEXT_CAP;
    const estimated = estimateRequiredTranslationContext(
      options.sourceTextLength ?? 0,
      options.maxTokens ?? DEFAULT_RESPONSE_TOKEN_BUDGET
    );
    return clampToModelContext(Math.min(estimated, cap), options.model);
  }

  const requested =
    parsePositiveInteger(
      process.env.CODEAI_LMSTUDIO_TRANSLATION_CONTEXT_LENGTH
    ) ?? DEFAULT_GENERIC_TRANSLATION_CONTEXT_LENGTH;
  return clampToModelContext(requested, options.model);
};

const resolvePurposeTtlSeconds = (
  purpose: LocalModelRuntimePurpose
): number => {
  const globalOverride = parsePositiveInteger(
    process.env.CODEAI_LMSTUDIO_TTL_SECONDS
  );
  if (globalOverride) {
    return globalOverride;
  }

  if (purpose === "workflow-agent") {
    return (
      parsePositiveInteger(process.env.CODEAI_LMSTUDIO_AGENT_TTL_SECONDS) ??
      DEFAULT_AGENT_TTL_SECONDS
    );
  }

  if (purpose === "translation-reasoning") {
    return (
      parsePositiveInteger(process.env.CODEAI_LMSTUDIO_REASONING_TTL_SECONDS) ??
      DEFAULT_REASONING_TTL_SECONDS
    );
  }

  if (purpose === "translation-localization") {
    return (
      parsePositiveInteger(
        process.env.CODEAI_LMSTUDIO_LOCALIZATION_TTL_SECONDS
      ) ?? DEFAULT_LOCALIZATION_TTL_SECONDS
    );
  }

  return (
    parsePositiveInteger(process.env.CODEAI_LMSTUDIO_TRANSLATION_TTL_SECONDS) ??
    DEFAULT_GENERIC_TRANSLATION_TTL_SECONDS
  );
};

const buildCodeAiIdentifier = (
  modelKey: string,
  purpose: LocalModelRuntimePurpose,
  contextLength: number
): string =>
  `${CODEAI_IDENTIFIER_PREFIX}-${purpose}-${modelKey.replace(
    LM_STUDIO_IDENTIFIER_SAFE_PATTERN,
    "-"
  )}-${contextLength}`;

const parseLoadedModels = (
  payload: string
): readonly LoadedLmStudioModelRecord[] => {
  try {
    const parsed = JSON.parse(payload) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isLoadedLlmForModel = (
  record: LoadedLmStudioModelRecord,
  modelKey: string
): boolean => record.type === "llm" && record.modelKey === modelKey;

const isLoadedLlm = (record: LoadedLmStudioModelRecord): boolean =>
  record.type === "llm";

const asIdentifier = (record: LoadedLmStudioModelRecord): string | null =>
  typeof record.identifier === "string" && record.identifier.trim().length > 0
    ? record.identifier.trim()
    : null;

const hasEnoughContext = (
  record: LoadedLmStudioModelRecord,
  contextLength: number
): boolean =>
  typeof record.contextLength === "number" &&
  record.contextLength >= contextLength;

const isIdleDuplicateCandidate = (
  record: LoadedLmStudioModelRecord,
  modelKey: string,
  selectedIdentifier: string
): boolean => {
  const identifier = asIdentifier(record);
  if (!identifier || identifier === selectedIdentifier) {
    return false;
  }
  if (record.status !== "idle") {
    return false;
  }
  return (
    identifier === modelKey ||
    identifier.startsWith(`${CODEAI_IDENTIFIER_PREFIX}-`) ||
    identifier.startsWith(`${modelKey}:`)
  );
};

const isIdleCodeAiOwnedWorker = (
  record: LoadedLmStudioModelRecord
): boolean => {
  const identifier = asIdentifier(record);
  return (
    !!identifier &&
    record.status === "idle" &&
    identifier.startsWith(`${CODEAI_IDENTIFIER_PREFIX}-`)
  );
};

export class LocalModelsRuntimeLoadManager {
  private readonly commandRunner: LmsCommandRunner;
  private readonly modelLoadTimeoutMs: number;

  constructor(options: LocalModelsRuntimeLoadManagerOptions) {
    this.commandRunner = options.commandRunner;
    this.modelLoadTimeoutMs =
      options.modelLoadTimeoutMs ?? DEFAULT_MODEL_LOAD_TIMEOUT_MS;
  }

  ensureModelLoaded(options: EnsureLocalModelLoadedOptions): string {
    const contextLength = resolveRequestedContextLength(options);
    const preferredIdentifier = buildCodeAiIdentifier(
      options.model.modelKey,
      options.purpose,
      contextLength
    );

    const loadedModels = parseLoadedModels(
      this.commandRunner(["ps", "--json"], {
        timeoutMs: this.modelLoadTimeoutMs,
      })
    ).filter(isLoadedLlm);
    const loadedModelsForSelectedModel = loadedModels.filter((record) =>
      isLoadedLlmForModel(record, options.model.modelKey)
    );
    const reusable = this.resolveReusableLoadedModel(
      loadedModelsForSelectedModel,
      contextLength,
      preferredIdentifier
    );
    const selectedIdentifier = reusable ?? preferredIdentifier;
    this.unloadIdleDuplicates(
      loadedModelsForSelectedModel,
      options.model.modelKey,
      selectedIdentifier
    );
    if (!reusable) {
      const loadArgs = [
        "load",
        options.model.modelKey,
        "--yes",
        "--context-length",
        String(contextLength),
        "--identifier",
        preferredIdentifier,
      ];
      if (!options.persistent) {
        loadArgs.push(
          "--ttl",
          String(resolvePurposeTtlSeconds(options.purpose))
        );
      }
      this.commandRunner(loadArgs, { timeoutMs: this.modelLoadTimeoutMs });
    }
    return selectedIdentifier;
  }

  unloadIdleCodeAiOwnedWorkers(): void {
    this.unloadIdleCodeAiOwnedWorkersExcept([]);
  }

  unloadIdleCodeAiOwnedWorkersExcept(
    preservedModelKeys: readonly string[]
  ): void {
    const preserved = new Set(preservedModelKeys);
    const loadedModels = parseLoadedModels(
      this.commandRunner(["ps", "--json"], {
        timeoutMs: this.modelLoadTimeoutMs,
      })
    ).filter(isLoadedLlm);
    for (const record of loadedModels) {
      if (!isIdleCodeAiOwnedWorker(record)) {
        continue;
      }
      if (
        typeof record.modelKey === "string" &&
        preserved.has(record.modelKey)
      ) {
        continue;
      }
      const identifier = asIdentifier(record);
      if (identifier) {
        this.commandRunner(["unload", identifier], {
          timeoutMs: this.modelLoadTimeoutMs,
        });
      }
    }
  }

  private resolveReusableLoadedModel(
    loadedModels: readonly LoadedLmStudioModelRecord[],
    contextLength: number,
    preferredIdentifier: string
  ): string | null {
    const exactMatch = loadedModels.find(
      (record) =>
        asIdentifier(record) === preferredIdentifier &&
        hasEnoughContext(record, contextLength)
    );
    if (exactMatch) {
      return preferredIdentifier;
    }
    const sufficientCodeAiMatch = loadedModels.find((record) => {
      const identifier = asIdentifier(record);
      return (
        !!identifier &&
        identifier.startsWith(`${CODEAI_IDENTIFIER_PREFIX}-`) &&
        hasEnoughContext(record, contextLength)
      );
    });
    if (sufficientCodeAiMatch) {
      return asIdentifier(sufficientCodeAiMatch);
    }
    const sufficientLoadedMatch = loadedModels.find((record) =>
      hasEnoughContext(record, contextLength)
    );
    return sufficientLoadedMatch ? asIdentifier(sufficientLoadedMatch) : null;
  }

  private unloadIdleDuplicates(
    loadedModels: readonly LoadedLmStudioModelRecord[],
    modelKey: string,
    selectedIdentifier: string
  ): void {
    for (const record of loadedModels) {
      if (!isIdleDuplicateCandidate(record, modelKey, selectedIdentifier)) {
        continue;
      }
      const identifier = asIdentifier(record);
      if (identifier) {
        this.commandRunner(["unload", identifier], {
          timeoutMs: this.modelLoadTimeoutMs,
        });
      }
    }
  }
}
