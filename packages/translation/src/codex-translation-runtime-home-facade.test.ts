import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CodexTranslationRuntimeHomeFacade } from "./codex-translation-runtime-home-facade";

const createTempRoot = (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codex-translation-runtime-home-"));

test("CodexTranslationRuntimeHomeFacade falls back to legacy auth when provider home is absent", async () => {
  const root = await createTempRoot();
  const legacyCodexHome = path.join(root, "legacy");
  const providerCodexHome = path.join(root, "provider-missing");
  const authPath = path.join(legacyCodexHome, "auth.json");
  const modelsCachePath = path.join(legacyCodexHome, "models_cache.json");

  await mkdir(legacyCodexHome, { recursive: true });
  await writeFile(authPath, '{"token":"legacy"}\n', "utf8");
  await writeFile(
    modelsCachePath,
    '{"models":["gpt-5.3-codex-spark"]}\n',
    "utf8"
  );

  const facade = new CodexTranslationRuntimeHomeFacade({
    legacyCodexHome,
    providerCodexHome,
  });

  const runtime = await facade.materialize({
    modelId: "gpt-5.3-codex-spark",
    modelInstructions: "Translate precisely.",
    reasoningEffort: "low",
  });

  try {
    const runtimeAuth = await readFile(
      path.join(runtime.homePath, "auth.json"),
      "utf8"
    );
    const runtimeModelsCache = await readFile(
      path.join(runtime.homePath, "models_cache.json"),
      "utf8"
    );

    assert.equal(runtimeAuth, '{"token":"legacy"}\n');
    assert.equal(runtimeModelsCache, '{"models":["gpt-5.3-codex-spark"]}\n');
  } finally {
    await runtime.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("CodexTranslationRuntimeHomeFacade tolerates missing models cache", async () => {
  const root = await createTempRoot();
  const providerCodexHome = path.join(root, "provider");
  const legacyCodexHome = path.join(root, "legacy-missing");
  const authPath = path.join(providerCodexHome, "auth.json");

  await mkdir(providerCodexHome, { recursive: true });
  await writeFile(authPath, '{"token":"provider"}\n', "utf8");

  const facade = new CodexTranslationRuntimeHomeFacade({
    legacyCodexHome,
    providerCodexHome,
  });

  const runtime = await facade.materialize({
    modelId: "gpt-5.4-mini",
    modelInstructions: "Translate precisely.",
    reasoningEffort: "low",
  });

  try {
    const runtimeAuth = await readFile(
      path.join(runtime.homePath, "auth.json"),
      "utf8"
    );
    await assert.rejects(
      access(path.join(runtime.homePath, "models_cache.json"))
    );
    assert.equal(runtimeAuth, '{"token":"provider"}\n');
  } finally {
    await runtime.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});

test("CodexTranslationRuntimeHomeFacade reuses bootstrap artifacts from legacy home", async () => {
  const root = await createTempRoot();
  const legacyCodexHome = path.join(root, "legacy");
  const providerCodexHome = path.join(root, "provider-missing");

  await mkdir(path.join(legacyCodexHome, ".tmp", "plugins"), {
    recursive: true,
  });
  await mkdir(path.join(legacyCodexHome, "skills", ".system"), {
    recursive: true,
  });
  await writeFile(
    path.join(legacyCodexHome, "auth.json"),
    '{"token":"legacy"}\n',
    "utf8"
  );
  await writeFile(
    path.join(legacyCodexHome, ".tmp", "plugins", "README.md"),
    "plugin-cache\n",
    "utf8"
  );
  await writeFile(
    path.join(legacyCodexHome, ".tmp", "plugins.sha"),
    "sha256:cached\n",
    "utf8"
  );
  await writeFile(
    path.join(legacyCodexHome, ".tmp", "app-server-remote-plugin-sync-v1"),
    "synced\n",
    "utf8"
  );
  await writeFile(
    path.join(legacyCodexHome, "installation_id"),
    "installation-123\n",
    "utf8"
  );
  await writeFile(
    path.join(
      legacyCodexHome,
      "skills",
      ".system",
      ".codex-system-skills.marker"
    ),
    "installed\n",
    "utf8"
  );

  const facade = new CodexTranslationRuntimeHomeFacade({
    legacyCodexHome,
    providerCodexHome,
  });

  const runtime = await facade.materialize({
    modelId: "gpt-5.4-mini",
    modelInstructions: "Translate precisely.",
    reasoningEffort: "low",
  });

  try {
    const runtimePluginReadme = await readFile(
      path.join(runtime.homePath, ".tmp", "plugins", "README.md"),
      "utf8"
    );
    const runtimePluginSha = await readFile(
      path.join(runtime.homePath, ".tmp", "plugins.sha"),
      "utf8"
    );
    const runtimeSyncMarker = await readFile(
      path.join(runtime.homePath, ".tmp", "app-server-remote-plugin-sync-v1"),
      "utf8"
    );
    const runtimeInstallationId = await readFile(
      path.join(runtime.homePath, "installation_id"),
      "utf8"
    );
    const runtimeSkillsMarker = await readFile(
      path.join(
        runtime.homePath,
        "skills",
        ".system",
        ".codex-system-skills.marker"
      ),
      "utf8"
    );

    assert.equal(runtimePluginReadme, "plugin-cache\n");
    assert.equal(runtimePluginSha, "sha256:cached\n");
    assert.equal(runtimeSyncMarker, "synced\n");
    assert.equal(runtimeInstallationId, "installation-123\n");
    assert.equal(runtimeSkillsMarker, "installed\n");
  } finally {
    await runtime.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
