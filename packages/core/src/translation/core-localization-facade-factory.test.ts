import assert from "node:assert/strict";
import { access, chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ClaudeHaikuTranslationService,
  ClaudeHaikuTranslationServiceResult,
} from "@codeai-hub/claude-module";
import type {
  LocalizationRuntimeSettingsSnapshot,
  LocalizationSourceDictionary,
} from "@codeai-hub/localization";
import type { TranslationRequest } from "@codeai-hub/translation";
import { type CoreConfig, resolveGlobalLocalizationRootPath } from "../config";
import { resolveWorkspaceRuntimeCapsule } from "../workflow/runtime/workspace-runtime-capsule";
import { createCoreLocalizationFacade } from "./core-localization-facade-factory";

const STRUCTURED_ENTRY_PATTERN =
  /(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__START__)\n([\s\S]*?)\n(__CODEAI_HUB_LOCALIZATION_ENTRY__\d+__END__)/g;

const translateStructuredBatch = (text: string): string =>
  text.replace(
    STRUCTURED_ENTRY_PATTERN,
    (_match, startMarker: string, body: string, endMarker: string) =>
      `${startMarker}\n[ru] ${body.trim()}\n${endMarker}`
  );

const createFakeService = (): ClaudeHaikuTranslationService =>
  ({
    translate: (
      request: TranslationRequest
    ): Promise<ClaudeHaikuTranslationServiceResult> =>
      Promise.resolve({
        text: translateStructuredBatch(request.text),
      }),
  }) as unknown as ClaudeHaikuTranslationService;

const createRuntimeSettings = (): LocalizationRuntimeSettingsSnapshot => ({
  categories: {
    interactive_templates: "ru",
    system_feedback: "ru",
    ui_interface: "en",
    user_guidance: "ru",
    workflow_terms: "en",
  },
  defaultLanguage: "en",
  engineId: "anthropic-claude-haiku-4-5",
  workflowTermsPolicy: "keep_english",
});

const createSourceDictionaries =
  (): readonly LocalizationSourceDictionary[] => [
    {
      category: "interactive_templates",
      entries: {
        "artifact.help.body": "Artifact Help",
      },
      language: "en",
    },
    {
      category: "system_feedback",
      entries: {
        "pm.description.help.title": "Description Help",
      },
      language: "en",
    },
    {
      category: "ui_interface",
      entries: {
        "settings.header.title": "Settings",
      },
      language: "en",
    },
    {
      category: "user_guidance",
      entries: {
        "settings.localization.intro": "Helper Intro",
      },
      language: "en",
    },
    {
      category: "workflow_terms",
      entries: {
        "term.workflow": "Workflow",
      },
      language: "en",
    },
  ];

const createCoreConfig = (params: {
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
  globalSettingsPath: params.globalSettingsPath,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: path.join(params.workspaceRoot, "templates"),
});

const withFakeLmStudioCli = async (
  runTest: () => Promise<void> | void
): Promise<void> => {
  const binDirectory = await mkdtemp(path.join(tmpdir(), "codeai-lms-bin-"));
  const lmsPath = path.join(binDirectory, "lms");
  const originalPath = process.env.PATH;
  await writeFile(
    lmsPath,
    [
      "#!/bin/sh",
      'if [ "$1" = "ls" ] && [ "$2" = "--json" ]; then',
      'printf \'%s\\n\' \'[{"type":"llm","modelKey":"mlx-community/catalog-test","displayName":"Catalog Test","architecture":"gemma"}]\'',
      "exit 0",
      "fi",
      "exit 0",
      "",
    ].join("\n"),
    "utf8"
  );
  await chmod(lmsPath, 0o755);
  process.env.PATH = `${binDirectory}:${originalPath ?? ""}`;
  try {
    await runTest();
  } finally {
    process.env.PATH = originalPath;
  }
};

test("createCoreLocalizationFacade keeps labels in English while materializing helper categories through Haiku", async () => {
  const facade = createCoreLocalizationFacade({
    claudeHaikuTranslationService: createFakeService(),
    sourceDictionaries: createSourceDictionaries(),
  });

  const snapshot = await facade.resolveRuntimeBootstrapSnapshot(
    createRuntimeSettings()
  );

  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.source,
    "materialized"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.user_guidance.entries[
      "settings.localization.intro"
    ],
    "[ru] Helper Intro"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.system_feedback.language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.system_feedback.entries[
      "pm.description.help.title"
    ],
    "[ru] Description Help"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.interactive_templates
      .language,
    "ru"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.interactive_templates
      .entries["artifact.help.body"],
    "[ru] Artifact Help"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.language,
    "en"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.source,
    "source_fallback"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.ui_interface.entries[
      "settings.header.title"
    ],
    "Settings"
  );
  assert.equal(
    snapshot.runtimePayload.resolvedBundlesByCategory.workflow_terms.language,
    "en"
  );
});

test("createCoreLocalizationFacade stores runtime localization under global app root", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-l10n-core-"));
  const workspaceRoot = path.join(tempRoot, "workspace");
  const workspaceSlug = "workspace-localization";
  const fakeHome = path.join(tempRoot, "home");
  const originalHome = process.env.HOME;
  process.env.HOME = fakeHome;

  try {
    const config = createCoreConfig({
      globalSettingsPath: path.join(tempRoot, "global", "settings.json"),
      workspaceRoot,
      workspaceSlug,
    });
    const facade = createCoreLocalizationFacade({
      claudeHaikuTranslationService: createFakeService(),
      config,
      sourceDictionaries: createSourceDictionaries(),
    });

    await facade.resolveRuntimeBootstrapSnapshot(createRuntimeSettings());

    const localizationRoot = resolveGlobalLocalizationRootPath(config);
    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug,
    });
    const bootstrapPath = path.join(
      localizationRoot,
      "cache",
      "browser-runtime-bootstrap.json"
    );
    const userGuidanceBundlePath = path.join(
      localizationRoot,
      "catalogs",
      "user_guidance",
      "ru.json"
    );
    const snapshot = JSON.parse(await readFile(bootstrapPath, "utf8")) as {
      readonly settings: LocalizationRuntimeSettingsSnapshot;
    };
    const userGuidanceBundle = JSON.parse(
      await readFile(userGuidanceBundlePath, "utf8")
    ) as { readonly entries: Record<string, string> };

    assert.equal(snapshot.settings.categories.user_guidance, "ru");
    assert.equal(
      userGuidanceBundle.entries["settings.localization.intro"],
      "[ru] Helper Intro"
    );
    await assert.rejects(
      access(
        path.join(
          capsule.localizationRoot.absolutePath,
          "cache",
          "browser-runtime-bootstrap.json"
        )
      ),
      { code: "ENOENT" }
    );
  } finally {
    if (originalHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = originalHome;
    }
  }
});

test("createCoreLocalizationFacade exposes LM Studio local model language catalogs", async () => {
  await withFakeLmStudioCli(() => {
    const facade = createCoreLocalizationFacade({
      sourceDictionaries: createSourceDictionaries(),
    });
    const localCatalog = facade
      .listAvailableEngines()
      .find(
        (catalog) => catalog.engineId === "lmstudio:mlx-community/catalog-test"
      );

    assert.equal(
      localCatalog?.languages.some((language) => language.code === "ru"),
      true
    );
  });
});
