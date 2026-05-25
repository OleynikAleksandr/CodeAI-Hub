import type { ProviderStackId } from "../../../types/provider";
import {
  CLAUDE_MODEL_ALIAS_SET,
  CLAUDE_THINKING_EFFORT_SET,
  type ClaudeModelAliasId,
  type ClaudeThinkingEffort,
} from "../../../types/claude-model-registry";
import {
  CODEX_SETTINGS_MODELS,
  CODEX_REASONING_LEVELS,
  type CodexModelId,
  type CodexReasoningLevel,
} from "../../../types/codex-model-registry";
import {
  GEMINI_MODEL_ID_SET,
  GEMINI_THINKING_LEVELS,
  type GeminiModelId,
  type GeminiThinkingLevel,
} from "../../../types/gemini-model-registry";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_MODEL_ID_SET,
  type KimiModelId,
} from "../../../types/kimi-model-registry";
import { api } from "../api";
import {
  DescriptionSubmitService,
  resolveArtifactsForTheUserLanguage,
} from "./description-submit-service";
import type { SettingsLoadedPayload } from "../core-stream-message-types";
import type { Settings } from "../../ui/src/components/settings/settings-state-model";
import {
  updateClaudeDefaultModel,
  updateCodexDefaultModel,
  updateCodexReasoning,
  updateGeminiDefaultModel,
  updateGeminiThinking,
  updateThinkingSettings,
} from "../../ui/src/components/settings/settings-state-helpers";
import { resolveWorkflowChatLanguage } from "./prompt-pack-builder";
import {
  loadWorkflowSettingsPayload,
  saveWorkflowSettingsAndWait,
  type WorkflowSettingsLoader,
  type WorkflowSettingsSaver,
} from "./workflow-step-settings-transport";

type StartWorkflowStepParams = {
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: ProviderStackId;
  readonly modelId?: string | null;
  readonly reasoning?: string | null;
  readonly onSessionCreated?: (sessionId: string) => void;
};

type ContinuityStageId =
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

type WorkflowStageStartPolicy =
  | "managed_dispatch"
  | "provider_direct"
  | "core_preview_boundary";

type WorkflowStateGetter = (
  workspaceSlug: string,
  workspacePath?: string
) => ReturnType<typeof api.getWorkflowState>;

type SettingsPayloadGetter = () => SettingsLoadedPayload | null;

type SubmitQuestionnaireService = Pick<
  DescriptionSubmitService,
  "submitQuestionnaire"
>;

const CODEX_MODEL_ID_SET = new Set<string>(
  CODEX_SETTINGS_MODELS.map((model) => model.id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);
const GEMINI_THINKING_LEVEL_SET = new Set<string>(
  GEMINI_THINKING_LEVELS.map((level) => level.name)
);
const isSettings = (value: unknown): value is Settings =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isClaudeModelAliasId = (value: string): value is ClaudeModelAliasId =>
  CLAUDE_MODEL_ALIAS_SET.has(value as ClaudeModelAliasId);

const isClaudeThinkingEffort = (value: string): value is ClaudeThinkingEffort =>
  CLAUDE_THINKING_EFFORT_SET.has(value as ClaudeThinkingEffort);

const isCodexModelId = (value: string): value is CodexModelId =>
  CODEX_MODEL_ID_SET.has(value);

const isCodexReasoningLevel = (value: string): value is CodexReasoningLevel =>
  CODEX_REASONING_LEVEL_SET.has(value);

const isGeminiModelId = (value: string): value is GeminiModelId =>
  GEMINI_MODEL_ID_SET.has(value as GeminiModelId);

const isGeminiThinkingLevel = (value: string): value is GeminiThinkingLevel =>
  GEMINI_THINKING_LEVEL_SET.has(value);

const isKimiModelId = (value: string): value is KimiModelId =>
  KIMI_MODEL_ID_SET.has(value as KimiModelId);

const normalizeStartCardSelection = (value: string | null | undefined): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const applyStartCardModelDefaults = (
  settings: Settings,
  params: Pick<StartWorkflowStepParams, "modelId" | "providerId" | "reasoning">
): Settings | null => {
  const modelId = normalizeStartCardSelection(params.modelId);
  const reasoning = normalizeStartCardSelection(params.reasoning);
  if (!modelId && !reasoning) {
    return null;
  }

  if (params.providerId === "claudeCodeCli") {
    const nextModelId =
      modelId && isClaudeModelAliasId(modelId)
        ? modelId
        : settings.providers.claude.defaultModel;
    let nextSettings =
      modelId && isClaudeModelAliasId(modelId)
        ? updateClaudeDefaultModel(settings, modelId)
        : settings;
    if (reasoning && isClaudeThinkingEffort(reasoning)) {
      nextSettings = updateThinkingSettings(nextSettings, true, reasoning);
    }
    return nextSettings.providers.claude.defaultModel === nextModelId
      ? nextSettings
      : null;
  }

  if (params.providerId === "codexCli") {
    if (!modelId || !isCodexModelId(modelId)) {
      return null;
    }
    let nextSettings = updateCodexDefaultModel(settings, modelId);
    if (reasoning && isCodexReasoningLevel(reasoning)) {
      nextSettings = updateCodexReasoning(nextSettings, modelId, reasoning);
    }
    return nextSettings;
  }

  if (
    params.providerId === "kimiCode" ||
    params.providerId === "glmClaudeCode"
  ) {
    if (!modelId || !isKimiModelId(modelId)) {
      return null;
    }
    const providerSettingsKey =
      params.providerId === "glmClaudeCode" ? "glmClaudeCode" : "kimi";
    const fallbackProviderSettings =
      providerSettingsKey === "kimi"
        ? {
            autoUpdate: { enabled: false },
            defaultModel: DEFAULT_KIMI_MODEL_ID,
            thinkingDisplaySyncEnabled: true,
          }
        : {
            defaultModel: DEFAULT_KIMI_MODEL_ID,
            thinkingDisplaySyncEnabled: true,
          };
    return {
      ...settings,
      providers: {
        ...settings.providers,
        [providerSettingsKey]: {
          ...(settings.providers[providerSettingsKey] ??
            fallbackProviderSettings),
          defaultModel: modelId,
        },
      },
    };
  }

  if (!modelId || !isGeminiModelId(modelId)) {
    return null;
  }
  let nextSettings = updateGeminiDefaultModel(settings, modelId);
  if (reasoning && isGeminiThinkingLevel(reasoning)) {
    nextSettings = updateGeminiThinking(nextSettings, modelId, reasoning);
  }
  return nextSettings;
};

const readDiagramModulesSubstep = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null
): string | null => {
  const progress = state?.diagramModulesProgress;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return null;
  }
  const substep = progress.substep;
  return typeof substep === "string" ? substep : null;
};

const readStageBlocked = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null,
  stage: ContinuityStageId
): boolean => {
  const blocked = state?.gating?.blocked as
    | Readonly<Record<string, boolean>>
    | undefined;
  return blocked?.[stage] ?? true;
};

const resolveManagedStageMetadata = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null,
  stage: ContinuityStageId
) =>
  state?.managedWorkflowPreview?.stages.find(
    (candidate) => candidate.controllerId === stage
  ) ?? null;

const resolveManagedStageStartPolicy = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null,
  stage: ContinuityStageId
): WorkflowStageStartPolicy =>
  resolveManagedStageMetadata(state, stage)?.startPolicy ??
  (stage === "virtual_simulation"
    ? "provider_direct"
    : "managed_dispatch");

const isManagedReadOnlyStage = (
  state: Awaited<ReturnType<typeof api.getWorkflowState>> | null,
  stage: ContinuityStageId
): boolean =>
  state?.managedWorkflowPreview?.readOnlyStages.includes(stage) ??
  state?.technicalStageRewriteBoundary?.readOnlyStages.includes(stage) ??
  false;

const resolveExistingStageSessionIdForExplicitStart = (options: {
  readonly state: Awaited<ReturnType<typeof api.getWorkflowState>> | null;
  readonly stage: ContinuityStageId;
}): string | null => {
  const chains = options.state?.continuity?.chains ?? [];
  const controllerId =
    resolveManagedStageMetadata(options.state, options.stage)?.controllerId ??
    options.stage;
  let best: { readonly updatedAt: string; readonly sessionId: string } | null = null;

  for (const chain of chains) {
    if (chain.stage !== controllerId) {
      continue;
    }
    const sessionId = chain.segments.at(-1)?.sessionId ?? null;
    if (!sessionId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: chain.updatedAt, sessionId };
    }
  }

  return best?.sessionId ?? null;
};

export class WorkflowStepStartService {
  private readonly getWorkflowState: WorkflowStateGetter;
  private readonly getSettingsPayload: SettingsPayloadGetter;
  private readonly loadSettingsPayload: WorkflowSettingsLoader;
  private readonly saveSettings: WorkflowSettingsSaver;
  private readonly submitService: SubmitQuestionnaireService;

  constructor(options?: {
    readonly getWorkflowState?: WorkflowStateGetter;
    readonly getSettingsPayload?: SettingsPayloadGetter;
    readonly loadSettingsPayload?: WorkflowSettingsLoader;
    readonly saveSettings?: WorkflowSettingsSaver;
    readonly submitService?: SubmitQuestionnaireService;
  }) {
    this.getWorkflowState =
      options?.getWorkflowState ?? api.getWorkflowState.bind(api);
    this.getSettingsPayload =
      options?.getSettingsPayload ?? api.getLastSettingsPayload.bind(api);
    this.loadSettingsPayload =
      options?.loadSettingsPayload ??
      (options?.getSettingsPayload
        ? async () => options.getSettingsPayload?.() ?? null
        : loadWorkflowSettingsPayload);
    this.saveSettings = options?.saveSettings ?? saveWorkflowSettingsAndWait;
    this.submitService =
      options?.submitService ?? new DescriptionSubmitService();
  }

  private async resolveWorkflowSettingsPayload(
    params: StartWorkflowStepParams
  ): Promise<SettingsLoadedPayload | null> {
    try {
      return await this.loadSettingsPayload(params);
    } catch {
      return this.getSettingsPayload();
    }
  }

  private async persistStartCardModelDefaults(
    params: StartWorkflowStepParams,
    settingsPayload: SettingsLoadedPayload | null
  ): Promise<void> {
    const settings = settingsPayload?.settings;
    if (!isSettings(settings)) {
      return;
    }
    const nextSettings = applyStartCardModelDefaults(settings, params);
    if (nextSettings) {
      await this.saveSettings(nextSettings, params);
    }
  }

  async startVirtualSimulation(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveExistingStageSessionIdForExplicitStart({
      state,
      stage: "virtual_simulation",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }
    if (isManagedReadOnlyStage(state, "virtual_simulation")) {
      throw new Error(
        "Virtual Simulation is read-only after Diagram Modules has started."
      );
    }
    if (resolveManagedStageStartPolicy(state, "virtual_simulation") !== "provider_direct") {
      throw new Error(
        "Virtual Simulation is waiting for Core-managed start policy metadata."
      );
    }

    const finalDescriptionPath = state?.description?.finalPath;
    if (!finalDescriptionPath) {
      throw new Error("Missing Final_Description.md. Complete Description step first.");
    }
    const settingsPayload = await this.resolveWorkflowSettingsPayload(params);
    await this.persistStartCardModelDefaults(params, settingsPayload);
    const artifactLanguage = resolveArtifactsForTheUserLanguage(settingsPayload);
    const chatLanguage = resolveWorkflowChatLanguage(settingsPayload);
    return this.submitService.submitQuestionnaire({
      artifactLanguage,
      chatLanguage,
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: finalDescriptionPath,
      stage: "virtual_simulation",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

  async startDiagramModules(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveExistingStageSessionIdForExplicitStart({
      state,
      stage: "diagram_modules",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }

    const vsArtifactPath = `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    if (readStageBlocked(state, "diagram_modules")) {
      throw new Error("Missing virtual-simulation.md. Complete Virtual Simulation step first.");
    }
    if (resolveManagedStageStartPolicy(state, "diagram_modules") !== "managed_dispatch") {
      throw new Error(
        "Diagram Modules is waiting for Core-managed dispatch metadata."
      );
    }
    const progressSubstep = readDiagramModulesSubstep(state);
    const settingsPayload = await this.resolveWorkflowSettingsPayload(params);
    await this.persistStartCardModelDefaults(params, settingsPayload);
    const artifactLanguage = resolveArtifactsForTheUserLanguage(settingsPayload);
    const chatLanguage = resolveWorkflowChatLanguage(settingsPayload);
    const questionnairePath =
      progressSubstep === null
        ? vsArtifactPath
        : `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`;
    return this.submitService.submitQuestionnaire({
      artifactLanguage,
      chatLanguage,
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath,
      stage: "diagram_modules",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

  async startApplicationSkeleton(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveExistingStageSessionIdForExplicitStart({
      state,
      stage: "application_skeleton",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }
    if (readStageBlocked(state, "application_skeleton")) {
      throw new Error("Missing completed Diagram Modules. Complete Diagram Modules first.");
    }
    if (resolveManagedStageStartPolicy(state, "application_skeleton") === "core_preview_boundary") {
      throw new Error(
        "Application Skeleton is managed by the Core preview boundary."
      );
    }
    const settingsPayload = await this.resolveWorkflowSettingsPayload(params);
    await this.persistStartCardModelDefaults(params, settingsPayload);
    return this.submitService.submitQuestionnaire({
      artifactLanguage: resolveArtifactsForTheUserLanguage(settingsPayload),
      chatLanguage: resolveWorkflowChatLanguage(settingsPayload),
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`,
      stage: "application_skeleton",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }

  async startQualityGates(params: StartWorkflowStepParams): Promise<string> {
    const state = await this.getWorkflowState(
      params.workspaceSlug,
      params.workspacePath
    );
    const existingSessionId = resolveExistingStageSessionIdForExplicitStart({
      state,
      stage: "quality_gates",
    });
    if (existingSessionId) {
      params.onSessionCreated?.(existingSessionId);
      return existingSessionId;
    }
    if (readStageBlocked(state, "quality_gates")) {
      throw new Error("Missing accepted Application Skeleton. Complete Application Skeleton first.");
    }
    if (resolveManagedStageStartPolicy(state, "quality_gates") === "core_preview_boundary") {
      throw new Error(
        "Quality Gates is managed by the Core preview boundary."
      );
    }
    const settingsPayload = await this.resolveWorkflowSettingsPayload(params);
    await this.persistStartCardModelDefaults(params, settingsPayload);
    return this.submitService.submitQuestionnaire({
      artifactLanguage: resolveArtifactsForTheUserLanguage(settingsPayload),
      chatLanguage: resolveWorkflowChatLanguage(settingsPayload),
      workspaceName: params.workspaceName,
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspacePath,
      questionnairePath: `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`,
      stage: "quality_gates",
      providerId: params.providerId,
      onSessionCreated: params.onSessionCreated,
    });
  }
}
