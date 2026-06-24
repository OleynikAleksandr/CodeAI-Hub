import assert from "node:assert/strict";
import test from "node:test";
import type { CodexModuleOptions } from "@codeai-hub/codex-app-server-module";
import type { CoreConfig } from "../config";
import { ProviderRegistry } from "./index";
import { createCodexAdapterInstance } from "./provider-descriptor-factory";
import type { ProviderAdapter } from "./provider-module-loader.types";

class FakeCodexAdapter implements ProviderAdapter {
  static capturedWorkspace: CodexModuleOptions["workspace"] | null = null;

  constructor(options: CodexModuleOptions) {
    FakeCodexAdapter.capturedWorkspace = options.workspace;
  }

  closeSession(): Promise<void> {
    return Promise.resolve();
  }

  createSession(): Promise<string> {
    return Promise.resolve("thread-id");
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(): Promise<void> {
    return Promise.resolve();
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

const createCoreConfig = (overrides: Partial<CoreConfig> = {}): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 30,
  claudeDefaultModel: "sonnet",
  claudeProjectSlug: "workspace",
  claudeSettingsPath: "/settings.json",
  codexDefaultModel: "gpt-5.3-codex",
  codexDefaultReasoningEffort: "medium",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  host: "127.0.0.1",
  idleTtlMinutes: 60,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 3_600_000,
  templatesDir: "/templates",
  ...overrides,
});

const createAdapter = (config: CoreConfig): ProviderAdapter =>
  createCodexAdapterInstance({
    codexAdapterCtor: FakeCodexAdapter,
    config,
    createReporter: () => ({}),
  });

test("createCodexAdapterInstance defaults workflow permissions to non-interactive full access", () => {
  createAdapter(createCoreConfig());

  assert.equal(
    FakeCodexAdapter.capturedWorkspace?.defaultApprovalMode,
    "never"
  );
  assert.equal(
    FakeCodexAdapter.capturedWorkspace?.defaultSandboxMode,
    "danger-full-access"
  );
});

test("createCodexAdapterInstance preserves explicit Codex sandbox settings", () => {
  createAdapter(
    createCoreConfig({
      codexApprovalMode: "never",
      codexSandboxMode: "read-only",
    })
  );

  assert.equal(
    FakeCodexAdapter.capturedWorkspace?.defaultApprovalMode,
    "never"
  );
  assert.equal(
    FakeCodexAdapter.capturedWorkspace?.defaultSandboxMode,
    "read-only"
  );
});

test("ProviderRegistry dispose calls optional adapter disposers", () => {
  const disposeCalls: string[] = [];
  const warnings: unknown[] = [];
  const registry = Object.assign(Object.create(ProviderRegistry.prototype), {
    options: {
      logger: {
        warn: (_message: string, context: unknown) => warnings.push(context),
      },
    },
    providers: [
      {
        adapter: {
          dispose: () => disposeCalls.push("localModels"),
        },
        id: "localModels",
      },
      {
        adapter: {},
        id: "codexCli",
      },
    ],
    recoveryScheduler: {
      dispose: () => disposeCalls.push("scheduler"),
    },
  }) as ProviderRegistry;

  registry.dispose();

  assert.deepEqual(disposeCalls, ["scheduler", "localModels"]);
  assert.deepEqual(warnings, []);
});
