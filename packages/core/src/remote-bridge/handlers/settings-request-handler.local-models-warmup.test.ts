import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  LocalizationFacade,
  LocalizationRuntimePayload,
} from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import type { BridgeEvent } from "../types";
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
  activeEngineId: "google-gtx",
  availableEngines: [],
  resolvedBundlesByCategory: {
    interactive_templates: {
      entries: {},
      language: "en",
      source: "source_fallback",
    },
    system_feedback: { entries: {}, language: "en", source: "source_fallback" },
    ui_interface: { entries: {}, language: "en", source: "source_fallback" },
    user_guidance: { entries: {}, language: "en", source: "source_fallback" },
    workflow_terms: { entries: {}, language: "en", source: "source_fallback" },
  },
});

const createSettings = (): Record<string, unknown> => ({
  general: {
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
      glossaryEnabled: true,
      reasoningEngineId: "google-gtx",
      uiEngineId: "google-gtx",
      workflowTermsPolicy: "keep_english",
    },
  },
  providers: {
    localModels: { defaultModel: "workflow-local" },
  },
});

const logger = new Logger("error");

test("SettingsRequestHandler schedules local models warmup after workspace settings save", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "settings-lm-save-"));
  const workspaceRoot = path.join(tempRoot, "target-workspace");
  const workspaceSlug = "codeai-hub-codex-5-4";
  const events: BridgeEvent[] = [];
  const scheduledWarmups: Array<() => void> = [];
  const warmupSettingsPaths: string[] = [];
  const config = createConfig({
    globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
    workspaceRoot: path.join(tempRoot, "default-workspace"),
    workspaceSlug: "default-workspace",
  });
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug,
  });

  const handler = new SettingsRequestHandler({
    broadcaster: (event) => events.push(event),
    config,
    createLocalizationFacade: () =>
      ({
        listAvailableEngines: () => [],
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

  await handler.handleSave(createSettings(), { workspaceRoot, workspaceSlug });

  assert.equal(
    events.some((event) => event.type === "settings:saved"),
    true
  );
  assert.deepEqual(warmupSettingsPaths, []);
  assert.equal(scheduledWarmups.length, 1);

  scheduledWarmups[0]?.();

  assert.deepEqual(warmupSettingsPaths, [capsule.settingsFile.absolutePath]);
});
