import assert from "node:assert/strict";
import test from "node:test";
import type {
  LocalizationFacade,
  LocalizationRuntimePayload,
} from "@codeai-hub/localization";
import type { BridgeEvent } from "../types";
import { SettingsSavedBroadcaster } from "./settings-saved-broadcaster";

const createRuntimePayload = (): LocalizationRuntimePayload =>
  ({
    activeEngineId: "google-gtx",
    availableEngines: [],
    resolvedBundlesByCategory: {},
  }) as LocalizationRuntimePayload;

test("SettingsSavedBroadcaster broadcasts saved settings when localization sync fails", async () => {
  const events: BridgeEvent[] = [];
  const broadcaster = new SettingsSavedBroadcaster({
    broadcaster: (event) => events.push(event),
    localizationFacade: {
      resolveRuntimePayload: () => Promise.resolve(createRuntimePayload()),
      synchronizeRuntimePayload: () =>
        Promise.reject(new Error("Apple Native language pack missing")),
    } as unknown as LocalizationFacade,
  });
  const settings = {
    general: {
      localization: {
        categories: { uiLabels: "uk" },
        glossaryEnabled: true,
        reasoningEngineId: "apple-native",
        uiEngineId: "apple-native",
      },
    },
    providers: {},
  };

  await broadcaster.publish(
    {
      affectedRuntimeBundleIds: ["ui_labels"],
      settings,
      syncMode: "strict",
    },
    {
      workspaceRoot: "/tmp/workspace",
      workspaceSlug: "demo-workspace",
    }
  );

  const savedEvent = events.find((event) => event.type === "settings:saved");
  assert.ok(savedEvent);
  const savedPayload = savedEvent.payload as Record<string, unknown>;
  assert.deepEqual(savedPayload.settings, settings);
  assert.equal(savedPayload.localizationRuntime, null);
  assert.equal(savedPayload.workspacePath, "/tmp/workspace");
  assert.equal(savedPayload.workspaceSlug, "demo-workspace");
  assert.deepEqual(
    events
      .filter((event) => event.type === "settings:localization-sync-status")
      .map((event) => event.payload),
    [
      {
        busy: true,
        message:
          "Localization sync is running. Project Manager and new sessions stay blocked until translated interface bundles are ready.",
      },
      {
        busy: false,
        message: "Localization sync failed: Apple Native language pack missing",
      },
    ]
  );
});

test("SettingsSavedBroadcaster reports preflight failure without invoking runtime sync", async () => {
  const events: BridgeEvent[] = [];
  let syncCalls = 0;
  const broadcaster = new SettingsSavedBroadcaster({
    broadcaster: (event) => events.push(event),
    localizationFacade: {
      resolveRuntimePayload: () => {
        syncCalls += 1;
        return Promise.resolve(createRuntimePayload());
      },
      synchronizeRuntimePayload: () => {
        syncCalls += 1;
        return Promise.resolve(createRuntimePayload());
      },
    } as unknown as LocalizationFacade,
  });

  await broadcaster.publish(
    {
      affectedRuntimeBundleIds: ["ui_labels"],
      settings: { general: {}, providers: {} },
      syncMode: "strict",
    },
    undefined,
    { syncFailureMessage: "Download selected language packs." }
  );

  assert.equal(syncCalls, 0);
  assert.equal(
    events.some((event) => event.type === "settings:saved"),
    true
  );
  assert.equal(
    (events.at(-1)?.payload as { readonly message?: string }).message,
    "Localization sync failed: Download selected language packs."
  );
});
