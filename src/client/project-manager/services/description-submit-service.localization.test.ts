import assert from "node:assert/strict";
import test from "node:test";

const installWindowStub = (): void => {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
      writable: true,
    });
  }

  Object.assign(window, {
    __CODEAI_LOCALIZATION_BOOTSTRAP__: null,
    addEventListener: () => {},
    clearTimeout,
    codeaiBridgeConfig: {
      httpUrl: "http://127.0.0.1:8080",
      wsUrl: "ws://127.0.0.1:8080",
    },
    dispatchEvent: () => true,
    setTimeout,
  });
};

test(
  "artifact language falls back to localization bootstrap snapshot when settings payload is unavailable",
  async () => {
  installWindowStub();
  const { resolveArtifactsForTheUserLanguage } = await import(
    "./description-submit-service"
  );
  window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = {
    cacheKey: "cache-key",
    generatedAt: "2026-04-13T17:08:32.725Z",
    runtimePayload: {
      activeEngineId: "codex-gpt-5.3-codex-spark",
      availableEngines: [],
      resolvedBundlesByCategory: {
        interactive_templates: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        system_feedback: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        ui_interface: {
          entries: {},
          language: "en",
          source: "source_fallback",
        },
        user_guidance: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        workflow_terms: {
          entries: {},
          language: "en",
          source: "source_fallback",
        },
      },
    },
    schemaVersion: 1,
    settings: {
      categories: {
        interactive_templates: "ru",
        system_feedback: "ru",
        ui_interface: "en",
        user_guidance: "ru",
        workflow_terms: "en",
      },
      defaultLanguage: "en",
      engineId: "codex-gpt-5.3-codex-spark",
      workflowTermsPolicy: "keep_english",
    },
  };

  assert.equal(resolveArtifactsForTheUserLanguage(null), "ru");
  }
);

test(
  "live settings payload keeps priority over bootstrap snapshot for artifact language",
  async () => {
  installWindowStub();
  const { resolveArtifactsForTheUserLanguage } = await import(
    "./description-submit-service"
  );
  window.__CODEAI_LOCALIZATION_BOOTSTRAP__ = {
    cacheKey: "cache-key",
    generatedAt: "2026-04-13T17:08:32.725Z",
    runtimePayload: {
      activeEngineId: "google-gtx",
      availableEngines: [],
      resolvedBundlesByCategory: {
        interactive_templates: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        system_feedback: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        ui_interface: {
          entries: {},
          language: "en",
          source: "source_fallback",
        },
        user_guidance: {
          entries: {},
          language: "ru",
          source: "source_fallback",
        },
        workflow_terms: {
          entries: {},
          language: "en",
          source: "source_fallback",
        },
      },
    },
    schemaVersion: 1,
    settings: {
      categories: {
        interactive_templates: "ru",
        system_feedback: "ru",
        ui_interface: "en",
        user_guidance: "ru",
        workflow_terms: "en",
      },
      defaultLanguage: "en",
      engineId: "google-gtx",
      workflowTermsPolicy: "keep_english",
    },
  };

  assert.equal(
    resolveArtifactsForTheUserLanguage({
      settings: {
        general: {
          localization: {
            categories: {
              artifactsForTheUser: "uk",
            },
          },
        },
      },
    } as const),
    "uk"
  );
  }
);
