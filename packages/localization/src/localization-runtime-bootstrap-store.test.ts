import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveLocalizationPaths } from "./localization-paths";
import {
  type LocalizationRuntimeBootstrapSnapshot,
  LocalizationRuntimeBootstrapStore,
} from "./localization-runtime-bootstrap-store";

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
