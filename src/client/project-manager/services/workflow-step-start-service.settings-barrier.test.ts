import assert from "node:assert/strict";
import test from "node:test";
import type { Settings } from "../../ui/src/components/settings/settings-state-model";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const installWindowStub = (): void => {
  if ("window" in globalThis) {
    return;
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => {},
      clearTimeout,
      codeaiBridgeConfig: {
        httpUrl: "http://127.0.0.1:8080",
        wsUrl: "ws://127.0.0.1:8080",
      },
      dispatchEvent: () => true,
      setTimeout,
    } as unknown as Window & typeof globalThis,
  });
};

const createWorkflowState = (): WorkflowStateSnapshot => ({
  workspaceSlug: "demo-workspace",
  updatedAt: "2026-05-08T12:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "completed",
    diagram_modules: "completed",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_skeleton: false,
      quality_gates: false,
    },
  },
});

const createSettings = (): Settings => ({
  general: {
    coreControls: { allowRestart: true },
    localization: {
      categories: {
        artifactsForTheUser: "en",
        interactiveTemplates: "en",
        messagesForTheUser: "en",
        reasoning: "en",
        systemFeedback: "en",
        uiHelperText: "en",
        uiInterface: "en",
        uiLabels: "en",
        userGuidance: "en",
        workflowTerms: "en",
      },
      defaultLanguage: "en",
      engineId: "google-gtx",
      glossaryEnabled: false,
      reasoningEngineId: "google-gtx",
      workflowTermsPolicy: "keep_english",
    },
    responsePolicy: {
      mode: "hybrid",
      strictOutput: {
        instructionText: "",
        schemaText: "{}",
      },
    },
    textToSpeech: { rate: 1 },
  },
  providers: {
    claude: {
      autoUpdate: { enabled: false },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
      thinking: { enabled: true, effort: "medium" },
      thinkingDisplaySyncEnabled: true,
    },
    codex: {
      autoUpdate: { enabled: false },
      defaultModel: "gpt-5.2",
      reasoningByModel: { "gpt-5.2": "medium" },
      reasoningSummaryEnabled: true,
      sessionContinuity: { remainingPercentThreshold: 30 },
      thinkingDisplaySyncEnabled: true,
    },
  },
});

test("Application Skeleton start waits for selected model settings before session creation", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");

  const events: string[] = [];
  let releaseSettingsSave!: () => void;
  const settingsSaved = new Promise<void>((resolve) => {
    releaseSettingsSave = resolve;
  });

  const service = new WorkflowStepStartService({
    getWorkflowState: async () => createWorkflowState(),
    getSettingsPayload: () => ({ settings: createSettings() }),
    saveSettings: async (settings, scope) => {
      events.push(
        `save:${settings.providers.claude.defaultModel}:${scope.workspacePath}:${scope.workspaceSlug}`
      );
      await settingsSaved;
      events.push("saved");
    },
    submitService: {
      submitQuestionnaire: async () => {
        events.push("session:create");
        return "application-skeleton-session";
      },
    },
  });

  const startPromise = service.startApplicationSkeleton({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "claudeCodeCli",
    modelId: "opus",
    reasoning: "high",
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, ["save:opus:/tmp/demo:demo-workspace"]);

  releaseSettingsSave();
  assert.equal(await startPromise, "application-skeleton-session");
  assert.deepEqual(events, [
    "save:opus:/tmp/demo:demo-workspace",
    "saved",
    "session:create",
  ]);
});

test("workflow starts load workspace settings before persisting selected defaults", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");
  const fallbackSettings = createSettings();
  const baseWorkspaceSettings = createSettings();
  const workspaceSettings: Settings = {
    ...baseWorkspaceSettings,
    general: {
      ...baseWorkspaceSettings.general,
      localization: {
        ...baseWorkspaceSettings.general.localization,
        categories: {
          ...baseWorkspaceSettings.general.localization.categories,
          artifactsForTheUser: "ru",
          reasoning: "ru",
        },
      },
    },
    providers: {
      ...baseWorkspaceSettings.providers,
      claude: {
        ...baseWorkspaceSettings.providers.claude,
        defaultModel: "haiku",
      },
    },
  };

  const loadScopes: string[] = [];
  const savedModels: string[] = [];
  const service = new WorkflowStepStartService({
    getWorkflowState: async () => createWorkflowState(),
    getSettingsPayload: () => ({ settings: fallbackSettings }),
    loadSettingsPayload: async (scope) => {
      loadScopes.push(`${scope.workspacePath}:${scope.workspaceSlug}`);
      return { settings: workspaceSettings };
    },
    saveSettings: (settings, scope) => {
      savedModels.push(
        `${settings.providers.claude.defaultModel}:${scope.workspacePath}:${scope.workspaceSlug}`
      );
    },
    submitService: {
      submitQuestionnaire: async (params) =>
        `${params.artifactLanguage}:${params.chatLanguage}`,
    },
  });

  const sessionId = await service.startApplicationSkeleton({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "claudeCodeCli",
    modelId: "opus",
    reasoning: "high",
  });

  assert.deepEqual(loadScopes, ["/tmp/demo:demo-workspace"]);
  assert.deepEqual(savedModels, ["opus:/tmp/demo:demo-workspace"]);
  assert.equal(sessionId, "ru:ru");
});

test("workflow starts skip settings save when selected defaults are unchanged", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");
  const settings = createSettings();
  const modelId = settings.providers.codex.defaultModel;
  const reasoning = settings.providers.codex.reasoningByModel[modelId];
  const events: string[] = [];

  const service = new WorkflowStepStartService({
    getWorkflowState: async () => ({
      ...createWorkflowState(),
      description: {
        finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
        questionnairePath:
          ".codeai-hub/demo-workspace/description/questionnaire.md",
        updatedAt: "2026-05-26T12:00:00.000Z",
      },
    }),
    loadSettingsPayload: async () => ({ settings }),
    saveSettings: () => {
      throw new Error("No-op start-card settings save should be skipped.");
    },
    submitService: {
      submitQuestionnaire: async () => {
        events.push("session:create");
        return "virtual-simulation-session";
      },
    },
  });

  const sessionId = await service.startVirtualSimulation({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "codexCli",
    modelId,
    reasoning,
  });

  assert.equal(sessionId, "virtual-simulation-session");
  assert.deepEqual(events, ["session:create"]);
});

test("workflow starts save selected OpenRouter model before session creation", async () => {
  installWindowStub();
  const { WorkflowStepStartService } = await import("./workflow-step-start-service");
  const settings = createSettings();
  const modelId = "deepseek/deepseek-chat-v3-0324:free";
  const events: string[] = [];

  const service = new WorkflowStepStartService({
    getWorkflowState: async () => ({
      ...createWorkflowState(),
      description: {
        finalPath: ".codeai-hub/demo-workspace/description/Final_Description.md",
        questionnairePath:
          ".codeai-hub/demo-workspace/description/questionnaire.md",
        updatedAt: "2026-05-26T12:00:00.000Z",
      },
    }),
    loadSettingsPayload: async () => ({ settings }),
    saveSettings: (nextSettings) => {
      events.push(
        `save:${nextSettings.providers.openRouter?.defaultModel}`
      );
    },
    submitService: {
      submitQuestionnaire: async () => {
        events.push("session:create");
        return "virtual-simulation-session";
      },
    },
  });

  const sessionId = await service.startVirtualSimulation({
    workspaceName: "Demo Workspace",
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
    providerId: "openRouter",
    modelId,
    reasoning: "default",
  });

  assert.equal(sessionId, "virtual-simulation-session");
  assert.deepEqual(events, [
    `save:${modelId}`,
    "session:create",
  ]);
});

test("workflow settings transport accepts only matching workspace settings events", async () => {
  installWindowStub();
  const { isSettingsEventForScope } = await import(
    "./workflow-step-settings-transport"
  );
  const scope = {
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  };

  assert.equal(
    isSettingsEventForScope({ settings: createSettings() }, scope),
    false
  );
  assert.equal(
    isSettingsEventForScope(
      {
        settings: createSettings(),
        workspacePath: "/tmp/other",
        workspaceSlug: "demo-workspace",
      },
      scope
    ),
    false
  );
  assert.equal(
    isSettingsEventForScope(
      {
        settings: createSettings(),
        workspacePath: "/tmp/demo",
        workspaceSlug: "demo-workspace",
      },
      scope
    ),
    true
  );
});
