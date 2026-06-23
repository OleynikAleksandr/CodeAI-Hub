import {
  loadLocalModelsSettingsSnapshot,
  loadReasoningTranslationEngineId,
} from "../config/provider-settings-snapshot";
import {
  createDefaultLmsCommandRunner,
  ensureLmStudioServerRunning,
  type LmsCommandRunner,
} from "./local-models-cli";
import { LocalModelsFacade } from "./local-models-facade";
import {
  type LocalModelRuntimePurpose,
  LocalModelsRuntimeLoadManager,
} from "./local-models-runtime-load-manager";

const LM_STUDIO_ENGINE_PREFIX = "lmstudio:";

interface LocalModelsWarmupReporter {
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}

interface LocalModelsWarmupOptions {
  readonly commandRunner?: LmsCommandRunner;
  readonly env?: NodeJS.ProcessEnv;
  readonly reporter?: LocalModelsWarmupReporter;
  readonly settingsPath: string;
}

interface WarmupTarget {
  readonly modelKey: string;
  readonly purpose: LocalModelRuntimePurpose;
  readonly sources: readonly string[];
}

interface WarmupRecord extends WarmupTarget {
  readonly error?: string;
  readonly identifier?: string;
  readonly reason?: string;
}

interface LocalModelsWarmupResult {
  readonly loaded: readonly WarmupRecord[];
  readonly skipped: readonly WarmupRecord[];
}

const normalizeString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readReasoningModelKey = (settingsPath: string): string | null => {
  const engineId = loadReasoningTranslationEngineId(settingsPath);
  return engineId.startsWith(LM_STUDIO_ENGINE_PREFIX)
    ? engineId.slice(LM_STUDIO_ENGINE_PREFIX.length).trim() || null
    : null;
};

const readWorkflowModelKey = (
  settingsPath: string,
  env: NodeJS.ProcessEnv
): string | null =>
  normalizeString(
    loadLocalModelsSettingsSnapshot(settingsPath)?.defaultModel
  ) ?? normalizeString(env.CODEAI_LMSTUDIO_DEFAULT_MODEL);

const addTarget = (
  targetsByModelKey: Map<string, WarmupTarget>,
  modelKey: string | null,
  purpose: LocalModelRuntimePurpose,
  source: string
): void => {
  if (!modelKey) {
    return;
  }
  const existing = targetsByModelKey.get(modelKey);
  if (!existing) {
    targetsByModelKey.set(modelKey, {
      modelKey,
      purpose,
      sources: [source],
    });
    return;
  }
  targetsByModelKey.set(modelKey, {
    modelKey,
    purpose:
      existing.purpose === "translation-reasoning" ? existing.purpose : purpose,
    sources: [...existing.sources, source],
  });
};

const resolveWarmupTargets = (
  settingsPath: string,
  env: NodeJS.ProcessEnv
): readonly WarmupTarget[] => {
  const targetsByModelKey = new Map<string, WarmupTarget>();
  addTarget(
    targetsByModelKey,
    readReasoningModelKey(settingsPath),
    "translation-reasoning",
    "reasoning"
  );
  addTarget(
    targetsByModelKey,
    readWorkflowModelKey(settingsPath, env),
    "workflow-agent",
    "workflow"
  );
  return [...targetsByModelKey.values()];
};

const skipAll = (
  targets: readonly WarmupTarget[],
  reason: string,
  error?: string
): LocalModelsWarmupResult => ({
  loaded: [],
  skipped: targets.map((target) => ({
    ...target,
    ...(error ? { error } : {}),
    reason,
  })),
});

export const warmSelectedLocalModels = (
  options: LocalModelsWarmupOptions
): LocalModelsWarmupResult => {
  const env = options.env ?? process.env;
  const targets = resolveWarmupTargets(options.settingsPath, env);
  if (targets.length === 0) {
    return { loaded: [], skipped: [] };
  }

  const commandRunner =
    options.commandRunner ?? createDefaultLmsCommandRunner();
  const serverErrorCode = ensureLmStudioServerRunning({
    commandRunner,
    reporter: options.reporter,
  });
  if (serverErrorCode) {
    options.reporter?.warn?.("LM Studio warmup skipped", { serverErrorCode });
    return skipAll(targets, "server_unavailable", serverErrorCode);
  }

  const models = new LocalModelsFacade({ commandRunner }).listModels();
  const runtimeLoadManager = new LocalModelsRuntimeLoadManager({
    commandRunner,
  });
  const loaded: WarmupRecord[] = [];
  const skipped: WarmupRecord[] = [];

  for (const target of targets) {
    const model = models.find(
      (candidate) => candidate.modelKey === target.modelKey
    );
    if (!model) {
      skipped.push({ ...target, reason: "model_not_found" });
      continue;
    }
    if (target.purpose === "workflow-agent") {
      skipped.push({ ...target, reason: "deferred_until_turn" });
      continue;
    }
    try {
      const identifier = runtimeLoadManager.ensureModelLoaded({
        model,
        persistent: true,
        purpose: target.purpose,
      });
      loaded.push({ ...target, identifier });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      options.reporter?.warn?.("LM Studio warmup load failed", {
        error: message,
        modelKey: target.modelKey,
        purpose: target.purpose,
      });
      skipped.push({ ...target, error: message, reason: "load_failed" });
    }
  }
  runtimeLoadManager.unloadIdleCodeAiOwnedWorkersExcept(
    targets.map((target) => target.modelKey)
  );

  if (loaded.length > 0) {
    options.reporter?.info?.("LM Studio warmup completed", {
      loaded: loaded.map((record) => ({
        identifier: record.identifier,
        modelKey: record.modelKey,
        purpose: record.purpose,
        sources: record.sources,
      })),
    });
  }
  return { loaded, skipped };
};
