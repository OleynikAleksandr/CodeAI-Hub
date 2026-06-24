import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  LocalizationFacade,
  LocalizationRuntimePayload,
  LocalizationRuntimeSettingsSnapshot,
  LocalizationSelectiveSyncOptions,
} from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import type { BridgeEvent } from "../types";
import type { WorkspaceSettingsScope } from "./settings-persistence-snapshot";
import { SettingsRequestHandler } from "./settings-request-handler";

const createConfig = (params: {
  readonly globalSettingsPath: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 30,
  claudeDefaultModel: "sonnet",
  claudeProjectSlug: params.workspaceSlug,
  claudeSettingsPath: params.globalSettingsPath,
  claudeWorkspacePath: params.workspaceRoot,
  codexDefaultModel: "gpt-5.3-codex",
  codexDefaultReasoningEffort: "medium",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: path.join(params.workspaceRoot, "templates"),
});

const createRuntimePayload = (): LocalizationRuntimePayload => ({
  activeEngineId: "codex-gpt-5.4-mini",
  availableEngines: [],
  resolvedBundlesByCategory: {
    interactive_templates: {
      entries: {},
      language: "en",
      source: "source_fallback",
    },
    system_feedback: {
      entries: {},
      language: "en",
      source: "source_fallback",
    },
    ui_interface: {
      entries: {},
      language: "en",
      source: "source_fallback",
    },
    user_guidance: {
      entries: { "settings.localization.intro": "Локализовано" },
      language: "ru",
      source: "materialized",
    },
    workflow_terms: {
      entries: {},
      language: "en",
      source: "source_fallback",
    },
  },
});
const createEngineCatalogs =
  (): LocalizationRuntimePayload["availableEngines"] => [
    { engineId: "google-gtx", languages: [{ code: "ru", label: "Russian" }] },
    {
      engineId: "lmstudio:gemma-4-26b-a4b-it",
      languages: [{ code: "ru", label: "Russian" }],
    },
  ];

const createSettings = (params: { readonly uiHelperText?: string } = {}) => {
  const uiHelperText = params.uiHelperText ?? "ru";
  return {
    general: {
      localization: {
        categories: {
          artifactsForTheUser: "en",
          interactiveTemplates: "en",
          messagesForTheUser: "en",
          reasoning: "ru",
          systemFeedback: "en",
          uiHelperText,
          uiInterface: "en",
          uiLabels: "en",
          userGuidance: uiHelperText,
          workflowTerms: "en",
        },
        defaultLanguage: "en",
        glossaryEnabled: true,
        reasoningEngineId: "apple-native",
        uiEngineId: "codex-gpt-5.4-mini",
        workflowTermsPolicy: "keep_english",
      },
    },
    providers: {
      claude: {},
      codex: {},
      kimi: {},
    },
  };
};

const logger = {
  warn() {
    return undefined;
  },
} as unknown as Logger;

test("SettingsRequestHandler syncs saved localization through the active workspace facade", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "settings-l10n-save-"));
  const defaultWorkspaceRoot = path.join(tempRoot, "default-workspace");
  const defaultWorkspaceSlug =
    "users-oleksandroliinyk-vscode-codeai-hub-codex-5-4";
  const targetWorkspaceRoot = path.join(tempRoot, "target-workspace");
  const targetWorkspaceSlug = "codeai-hub-codex-5-4";
  const events: BridgeEvent[] = [];
  const factoryWorkspaces: (WorkspaceSettingsScope | undefined)[] = [];
  const syncCalls: {
    readonly options?: LocalizationSelectiveSyncOptions;
    readonly settings: LocalizationRuntimeSettingsSnapshot;
  }[] = [];

  const config = createConfig({
    globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const targetCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  await mkdir(path.dirname(targetCapsule.settingsFile.absolutePath), {
    recursive: true,
  });
  await writeFile(
    targetCapsule.settingsFile.absolutePath,
    `${JSON.stringify(createSettings({ uiHelperText: "en" }), null, 2)}\n`,
    "utf8"
  );
  const createLocalizationFacade = (
    workspace?: WorkspaceSettingsScope
  ): LocalizationFacade => {
    factoryWorkspaces.push(workspace);
    const scopedWorkspace = workspace ?? {
      workspaceRoot: config.claudeWorkspacePath ?? defaultWorkspaceRoot,
      workspaceSlug: config.claudeProjectSlug,
    };
    const capsule = resolveWorkspaceRuntimeCapsule(scopedWorkspace);
    const markerPath = path.join(
      capsule.localizationRoot.absolutePath,
      "cache",
      "sync-marker.json"
    );
    return {
      listAvailableEngines: createEngineCatalogs,
      resolveRuntimePayload: () => Promise.resolve(createRuntimePayload()),
      synchronizeRuntimePayload: async (
        settings: LocalizationRuntimeSettingsSnapshot,
        options?: LocalizationSelectiveSyncOptions
      ) => {
        syncCalls.push({ settings, options });
        await mkdir(path.dirname(markerPath), { recursive: true });
        await writeFile(
          markerPath,
          `${JSON.stringify({ settings, options }, null, 2)}\n`,
          "utf8"
        );
        return createRuntimePayload();
      },
    } as unknown as LocalizationFacade;
  };

  const handler = new SettingsRequestHandler({
    broadcaster: (event) => events.push(event),
    config,
    createLocalizationFacade,
    logger,
  });

  await handler.handleSave(createSettings(), {
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });

  const defaultCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const targetMarkerPath = path.join(
    targetCapsule.localizationRoot.absolutePath,
    "cache",
    "sync-marker.json"
  );
  const marker = JSON.parse(await readFile(targetMarkerPath, "utf8")) as {
    readonly options: LocalizationSelectiveSyncOptions;
  };

  assert.equal(factoryWorkspaces.length, 1);
  assert.deepEqual(factoryWorkspaces[0], {
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  assert.equal(syncCalls.length, 1);
  assert.equal(syncCalls[0].settings.categories.user_guidance, "ru");
  assert.deepEqual(syncCalls[0].options, {
    affectedRuntimeBundleIds: ["user_guidance"],
  });
  assert.deepEqual(marker.options, {
    affectedRuntimeBundleIds: ["user_guidance"],
  });
  assert.equal(
    events.some(
      (event) =>
        event.type === "settings:localization-sync-status" &&
        (event.payload as { readonly message?: string }).message ===
          "Localization sync failed: Download selected language packs."
    ),
    false
  );
  await assert.rejects(
    access(
      path.join(
        defaultCapsule.localizationRoot.absolutePath,
        "cache",
        "sync-marker.json"
      )
    ),
    { code: "ENOENT" }
  );
});

test("SettingsRequestHandler resolves loaded localization through the active workspace facade", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "settings-l10n-load-"));
  const defaultWorkspaceRoot = path.join(tempRoot, "default-workspace");
  const defaultWorkspaceSlug =
    "users-oleksandroliinyk-vscode-codeai-hub-codex-5-4";
  const targetWorkspaceRoot = path.join(tempRoot, "target-workspace");
  const targetWorkspaceSlug = "codeai-hub-codex-5-4";
  const events: BridgeEvent[] = [];
  const factoryWorkspaces: (WorkspaceSettingsScope | undefined)[] = [];
  const resolveCalls: LocalizationRuntimeSettingsSnapshot[] = [];

  const config = createConfig({
    globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const targetCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  await mkdir(path.dirname(targetCapsule.settingsFile.absolutePath), {
    recursive: true,
  });
  await writeFile(
    targetCapsule.settingsFile.absolutePath,
    `${JSON.stringify(createSettings(), null, 2)}\n`,
    "utf8"
  );

  const createLocalizationFacade = (
    workspace?: WorkspaceSettingsScope
  ): LocalizationFacade => {
    factoryWorkspaces.push(workspace);
    return {
      listAvailableEngines: createEngineCatalogs,
      resolveRuntimePayload: (
        settings: LocalizationRuntimeSettingsSnapshot
      ) => {
        resolveCalls.push(settings);
        return Promise.resolve(createRuntimePayload());
      },
      synchronizeRuntimePayload: () => Promise.resolve(createRuntimePayload()),
    } as unknown as LocalizationFacade;
  };

  const handler = new SettingsRequestHandler({
    broadcaster: (event) => events.push(event),
    config,
    createLocalizationFacade,
    logger,
  });

  await handler.handleLoad({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });

  assert.equal(factoryWorkspaces.length, 1);
  assert.deepEqual(factoryWorkspaces[0], {
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  assert.equal(resolveCalls.length, 1);
  assert.equal(resolveCalls[0].categories.user_guidance, "ru");
  assert.equal(
    events.filter((event) => event.type === "settings:loaded").length,
    2
  );
  const firstLoaded = events.find((event) => event.type === "settings:loaded");
  assert.deepEqual(
    firstLoaded?.payload.availableEngines?.map((engine) => engine.engineId),
    ["google-gtx", "lmstudio:gemma-4-26b-a4b-it"]
  );
  assert.equal(firstLoaded?.payload.localizationRuntime, null);
});

test("SettingsRequestHandler schedules local models warmup after workspace settings load", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "settings-lm-warmup-"));
  const defaultWorkspaceRoot = path.join(tempRoot, "default-workspace");
  const defaultWorkspaceSlug =
    "users-oleksandroliinyk-vscode-codeai-hub-codex-5-4";
  const targetWorkspaceRoot = path.join(tempRoot, "target-workspace");
  const targetWorkspaceSlug = "codeai-hub-codex-5-4";
  const events: BridgeEvent[] = [];
  const scheduledWarmups: Array<() => void> = [];
  const warmupSettingsPaths: string[] = [];

  const config = createConfig({
    globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const targetCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  await mkdir(path.dirname(targetCapsule.settingsFile.absolutePath), {
    recursive: true,
  });
  await writeFile(
    targetCapsule.settingsFile.absolutePath,
    `${JSON.stringify(
      {
        ...createSettings(),
        providers: {
          ...createSettings().providers,
          localModels: { defaultModel: "workflow-local" },
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  const handler = new SettingsRequestHandler({
    broadcaster: (event) => events.push(event),
    config,
    createLocalizationFacade: () =>
      ({
        listAvailableEngines: createEngineCatalogs,
        resolveRuntimePayload: () => Promise.resolve(createRuntimePayload()),
        synchronizeRuntimePayload: () =>
          Promise.resolve(createRuntimePayload()),
      }) as unknown as LocalizationFacade,
    logger,
    scheduleLocalModelsWarmup(callback) {
      scheduledWarmups.push(callback);
    },
    warmSelectedLocalModels({ settingsPath }) {
      warmupSettingsPaths.push(settingsPath);
    },
  });

  await handler.handleLoad({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });

  assert.equal(
    events.filter((event) => event.type === "settings:loaded").length,
    2
  );
  assert.deepEqual(warmupSettingsPaths, []);
  assert.equal(scheduledWarmups.length, 1);

  scheduledWarmups[0]?.();

  assert.deepEqual(warmupSettingsPaths, [
    targetCapsule.settingsFile.absolutePath,
  ]);
});

test("SettingsRequestHandler opens user glossary in the active workspace runtime", async () => {
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), "settings-l10n-glossary-")
  );
  const defaultWorkspaceRoot = path.join(tempRoot, "default-workspace");
  const defaultWorkspaceSlug =
    "users-oleksandroliinyk-vscode-codeai-hub-codex-5-4";
  const targetWorkspaceRoot = path.join(tempRoot, "target-workspace");
  const targetWorkspaceSlug = "codeai-hub-codex-5-4";
  const events: BridgeEvent[] = [];
  const config = createConfig({
    globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const handler = new SettingsRequestHandler({
    broadcaster: (event) => events.push(event),
    config,
    logger,
  });

  await handler.handleOpenUserGlossaryFile({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });

  const targetCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: targetWorkspaceRoot,
    workspaceSlug: targetWorkspaceSlug,
  });
  const defaultCapsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: defaultWorkspaceRoot,
    workspaceSlug: defaultWorkspaceSlug,
  });
  const expectedPath = path.join(
    targetCapsule.localizationRoot.absolutePath,
    "glossary",
    "do-not-translate-terms.txt"
  );

  assert.deepEqual(events.at(-1), {
    type: "settings:user-glossary-file",
    payload: { path: expectedPath },
  });
  await access(expectedPath);
  await assert.rejects(
    access(
      path.join(
        defaultCapsule.localizationRoot.absolutePath,
        "glossary",
        "do-not-translate-terms.txt"
      )
    ),
    { code: "ENOENT" }
  );
});
