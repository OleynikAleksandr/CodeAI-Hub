import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LocalizationFacade,
  type LocalizationRuntimeBootstrapSnapshot,
  LocalizationRuntimeBootstrapStore,
  resolveLocalizationPaths,
  UserGlossaryStore,
} from "./index";

const createTempHomeDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-localization-bootstrap-"));

const createSnapshot = (): LocalizationRuntimeBootstrapSnapshot => ({
  cacheKey: "settings-hash::v1",
  generatedAt: "2026-04-04T11:56:00.000Z",
  runtimePayload: {
    activeEngineId: "google-gtx",
    availableEngines: [
      {
        engineId: "google-gtx",
        languages: [{ code: "ru", label: "Russian" }],
      },
    ],
    resolvedBundlesByCategory: {
      interactive_templates: {
        entries: { "artifact.help": "Pomoshch" },
        language: "ru",
        source: "materialized",
      },
      system_feedback: {
        entries: { "status.ready": "Gotovo" },
        language: "ru",
        source: "materialized",
      },
      ui_interface: {
        entries: { "button.open": "Otkryt'" },
        language: "ru",
        source: "materialized",
      },
      user_guidance: {
        entries: { "settings.hint": "Podskazka" },
        language: "ru",
        source: "materialized",
      },
      workflow_terms: {
        entries: { "term.workspace": "workspace" },
        language: "ru",
        source: "source_fallback",
      },
    },
  },
  schemaVersion: 1,
  settings: {
    categories: {
      interactive_templates: "ru",
      system_feedback: "ru",
      ui_interface: "ru",
      user_guidance: "ru",
      workflow_terms: "ru",
    },
    defaultLanguage: "ru",
    engineId: "google-gtx",
    workflowTermsPolicy: "translate",
  },
});

test("bootstrap store saves and loads the persisted startup snapshot", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const store = new LocalizationRuntimeBootstrapStore({ homeDirectory });
    const snapshot = createSnapshot();

    await store.save(snapshot);

    assert.deepEqual(await store.load(), snapshot);
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("bootstrap store ignores invalid persisted snapshot files", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const bootstrapPath =
      resolveLocalizationPaths(homeDirectory).browserRuntimeBootstrapFilePath;
    await mkdir(path.dirname(bootstrapPath), { recursive: true });
    await writeFile(bootstrapPath, '{"broken":true}\n', "utf8");

    const store = new LocalizationRuntimeBootstrapStore({ homeDirectory });

    assert.equal(await store.load(), null);
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("facade persists and reuses matching browser bootstrap snapshots", async () => {
  const homeDirectory = await createTempHomeDirectory();

  try {
    const facade = new LocalizationFacade();
    const bootstrapStore = new LocalizationRuntimeBootstrapStore({
      homeDirectory,
    });
    const glossaryDirectory =
      resolveLocalizationPaths(homeDirectory).glossaryDirectory;

    Object.assign(facade as object, {
      runtimeBootstrapStore: bootstrapStore,
      userGlossaryStore: new UserGlossaryStore({ glossaryDirectory }),
    });

    const settings = {
      categories: {
        interactive_templates: "source",
        system_feedback: "source",
        ui_interface: "source",
        user_guidance: "source",
        workflow_terms: "source",
      },
      defaultLanguage: "source",
      engineId: "google-gtx",
      workflowTermsPolicy: "keep_english" as const,
    };

    const firstPayload = await facade.resolveRuntimePayload(settings);
    const firstSnapshot = await bootstrapStore.load();

    assert.ok(firstSnapshot);
    assert.deepEqual(firstSnapshot.runtimePayload, firstPayload);

    const secondPayload = await facade.resolveRuntimePayload(settings);
    const secondSnapshot = await bootstrapStore.load();

    assert.deepEqual(secondPayload, firstPayload);
    assert.equal(secondSnapshot?.generatedAt, firstSnapshot.generatedAt);
    assert.deepEqual(
      await facade.loadRuntimeBootstrapSnapshot(settings),
      secondSnapshot
    );
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});
