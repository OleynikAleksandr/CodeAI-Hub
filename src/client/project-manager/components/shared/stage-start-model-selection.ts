import {
  CLAUDE_MODEL_ALIASES,
  DEFAULT_CLAUDE_MODEL_ALIAS,
  DEFAULT_CLAUDE_THINKING_EFFORT,
} from "../../../../types/claude-model-registry";
import {
  CODEX_SETTINGS_MODELS,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../types/codex-model-registry";
import {
  DEFAULT_GEMINI_MODEL_ID,
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_RECOMMENDED_MODELS,
} from "../../../../types/gemini-model-registry";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_RECOMMENDED_MODELS,
} from "../../../../types/kimi-model-registry";
import type { ProviderStackId } from "../../../../types/provider";
import type { SettingsLoadedPayload } from "../../core-stream-message-types";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";

export type StartCardModelOption = {
  readonly description: string;
  readonly id: string;
  readonly label: string;
};

export type StartCardReasoningOption = {
  readonly id: string;
  readonly label: string;
};

export type StartCardModelSelection = {
  readonly modelId: string;
  readonly reasoning: string;
};

type LocalTranslationEngineCatalog = {
  readonly engineId: string;
};

const OPENCODE_MODELS = [
  {
    description: "GLM 5.2 exposed through OpenCode with zai-coding-plan/glm-5.2.",
    id: "zai-coding-plan/glm-5.2",
    label: "GLM 5.2 / Z.AI Coding Plan",
  },
  {
    description: "Kimi K2.7 exposed through OpenCode with kimi-for-coding/k2p7.",
    id: "kimi-for-coding/k2p7",
    label: "Kimi K2.7 / Kimi For Coding",
  },
] as const;
const LOCAL_MODEL_ENGINE_PREFIX = "lmstudio:";
const DEFAULT_LOCAL_MODEL_ID = "local-model";

const isSettings = (value: unknown): value is Settings =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const formatLocalModelLabel = (modelKey: string): string =>
  modelKey
    .split("/")
    .pop()
    ?.replace(/[-_]+/gu, " ")
    .replace(/\b\w/gu, (match) => match.toUpperCase()) ?? modelKey;

const getLocalModelOptions = (
  availableEngines: readonly LocalTranslationEngineCatalog[]
): readonly StartCardModelOption[] =>
  availableEngines
    .filter((engine) => engine.engineId.startsWith(LOCAL_MODEL_ENGINE_PREFIX))
    .map((engine) => {
      const modelKey = engine.engineId.slice(LOCAL_MODEL_ENGINE_PREFIX.length);
      return {
        description: `LM Studio local model: ${modelKey}`,
        id: modelKey,
        label: formatLocalModelLabel(modelKey),
      };
    });

export const getStartCardModelOptions = (
  providerId: ProviderStackId,
  availableEngines: readonly LocalTranslationEngineCatalog[] = []
): readonly StartCardModelOption[] => {
  if (providerId === "localModels") {
    return getLocalModelOptions(availableEngines);
  }
  if (providerId === "claudeCodeCli") {
    return CLAUDE_MODEL_ALIASES.map((model) => ({
      description: model.description,
      id: model.alias,
      label: model.displayName,
    }));
  }
  if (providerId === "codexCli") {
    return CODEX_SETTINGS_MODELS.map((model) => ({
      description: model.description,
      id: model.id,
      label: model.displayName,
    }));
  }
  if (providerId === "kimiCode") {
    return KIMI_RECOMMENDED_MODELS.map((model) => ({
      description: model.description,
      id: model.id,
      label: model.displayName,
    }));
  }
  if (providerId === "glmOpenCode") {
    return OPENCODE_MODELS;
  }
  return GEMINI_RECOMMENDED_MODELS.map((model) => ({
    description: model.description,
    id: model.id,
    label: model.displayName,
  }));
};

export const getStartCardReasoningOptions = (
  providerId: ProviderStackId,
  modelId: string
): readonly StartCardReasoningOption[] => {
  if (providerId === "claudeCodeCli") {
    const model =
      CLAUDE_MODEL_ALIASES.find((candidate) => candidate.alias === modelId) ??
      CLAUDE_MODEL_ALIASES[0];
    return model.thinkingEffortOptions.map((effort) => ({
      id: effort,
      label: effort,
    }));
  }
  if (providerId === "codexCli") {
    const model =
      CODEX_SETTINGS_MODELS.find((candidate) => candidate.id === modelId) ??
      CODEX_SETTINGS_MODELS[0];
    return model.reasoningEffortOptions.map((effort) => ({
      id: effort,
      label: effort,
    }));
  }
  if (
    providerId === "kimiCode" ||
    providerId === "glmOpenCode" ||
    providerId === "localModels"
  ) {
    return [{ id: "default", label: "default" }];
  }
  const model =
    GEMINI_RECOMMENDED_MODELS.find((candidate) => candidate.id === modelId) ??
    GEMINI_RECOMMENDED_MODELS[0];
  return model.supportedThinkingLevels.map((level) => ({
    id: level,
    label: level,
  }));
};

export const resolveDefaultStartCardModelSelection = (
  payload: SettingsLoadedPayload | null,
  providerId: ProviderStackId,
  availableEngines: readonly LocalTranslationEngineCatalog[] = []
): StartCardModelSelection => {
  const settings = isSettings(payload?.settings) ? payload.settings : null;
  if (providerId === "localModels") {
    const options = getLocalModelOptions(availableEngines);
    const settingsDefault = settings?.providers.localModels?.defaultModel;
    const defaultModel = options.some((option) => option.id === settingsDefault)
      ? settingsDefault
      : options[0]?.id;
    return {
      modelId: defaultModel ?? settingsDefault ?? DEFAULT_LOCAL_MODEL_ID,
      reasoning: "default",
    };
  }
  if (providerId === "claudeCodeCli") {
    return {
      modelId: settings?.providers.claude.defaultModel ?? DEFAULT_CLAUDE_MODEL_ALIAS,
      reasoning:
        settings?.providers.claude.thinking.effort ??
        DEFAULT_CLAUDE_THINKING_EFFORT,
    };
  }
  if (providerId === "codexCli") {
    const modelId = settings?.providers.codex.defaultModel ?? DEFAULT_CODEX_MODEL_ID;
    return {
      modelId,
      reasoning:
        settings?.providers.codex.reasoningByModel[modelId] ??
        DEFAULT_CODEX_REASONING_LEVEL,
    };
  }
  if (providerId === "glmOpenCode") {
    return {
      modelId:
        settings?.providers.glmOpenCode?.defaultModel ??
        "zai-coding-plan/glm-5.2",
      reasoning: "default",
    };
  }
  if (providerId === "kimiCode") {
    return {
      modelId: settings?.providers.kimi?.defaultModel ?? DEFAULT_KIMI_MODEL_ID,
      reasoning: "default",
    };
  }
  const modelId = settings?.providers.gemini.defaultModel ?? DEFAULT_GEMINI_MODEL_ID;
  return {
    modelId,
    reasoning:
      settings?.providers.gemini.thinkingLevelByModel[modelId] ??
      DEFAULT_GEMINI_THINKING_LEVEL,
  };
};
