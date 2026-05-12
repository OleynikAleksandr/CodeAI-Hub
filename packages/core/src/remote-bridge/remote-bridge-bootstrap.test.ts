import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../provider-registry";
import { SessionManager } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import { createRemoteBridgeBootstrap } from "./remote-bridge-bootstrap";

const TEST_CORE_CONFIG = {
  host: "127.0.0.1",
  port: 8080,
  shutdownGracePeriodMs: 1000,
  idleTtlMinutes: null,
  managedMode: null,
  templatesDir: "/tmp/codeai-hub-test-templates",
  claudeWorkspacePath: "/tmp/codeai-hub-test-workspace",
  claudeProjectSlug: "codeai-hub-tests",
  claudeSettingsPath: "/tmp/codeai-hub-test-claude-settings.json",
  codexWorkspacePath: "/tmp/codeai-hub-test-workspace",
  codexSkipGitRepoCheck: true,
  geminiWorkspacePath: "/tmp/codeai-hub-test-workspace",
  geminiThinkingLevelByModel: {},
  geminiSettingsPath: "/tmp/codeai-hub-test-gemini-settings.json",
  claudeDefaultModel: "sonnet",
  claudeContinuityRemainingPercentThreshold: 30,
  continuityPreemptRemainingPercentThreshold: 50,
} as const;

const noop = (): void => {
  // noop
};

const createBootstrapHarness = () => {
  const sessionManager = new SessionManager();
  const providerRegistry = {
    getAdapter: () => null,
    listProviders: () => [],
  } as unknown as ProviderRegistry;
  const logger = {
    error: noop,
    info: noop,
    warn: noop,
  } as unknown as Logger;

  const bootstrap = createRemoteBridgeBootstrap({
    broadcaster: noop,
    buildInitialState: () => ({}) as never,
    config: TEST_CORE_CONFIG,
    logger,
    onShutdownRequested: noop,
    projectRegistry: {} as never,
    providerRegistry,
    sessionManager,
    version: "test",
  });

  const dispatchApi = bootstrap.sessionHandler as unknown as {
    readonly messageDispatch: {
      readonly dispatchUserMessage: (options: {
        readonly content: string;
        readonly hiddenUserMessage: boolean;
        readonly session: ReturnType<SessionManager["createSession"]>;
        readonly sessionId: string;
      }) => Promise<void>;
    };
  };

  return { bootstrap, dispatchApi, sessionManager };
};

test("bootstrap routes typed acceptance to Quality Gates runner for quality_gates sessions", async () => {
  const { bootstrap, dispatchApi, sessionManager } = createBootstrapHarness();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/bootstrap-quality-gates",
    "provider-quality-gates",
    {
      initiativeSlug: "demo",
      stage: "quality_gates",
    }
  );
  const recorded: Array<{
    readonly sessionId: string;
    readonly source: "typed-fallback" | "ui-button";
    readonly stage: "application_skeleton" | "quality_gates";
  }> = [];

  Object.assign(bootstrap.workflowStateService.managedPostTurnService, {
    handleApplicationSkeletonAcceptContractCommand: (params: {
      readonly sessionId: string;
      readonly source: "typed-fallback" | "ui-button";
    }) => {
      recorded.push({ ...params, stage: "application_skeleton" });
      return Promise.resolve({
        kind: "accepted" as const,
        stage: "application_skeleton" as const,
      });
    },
    handleQualityGatesAcceptContractCommand: (params: {
      readonly sessionId: string;
      readonly source: "typed-fallback" | "ui-button";
    }) => {
      recorded.push({ ...params, stage: "quality_gates" });
      return Promise.resolve({
        kind: "accepted" as const,
        stage: "quality_gates" as const,
      });
    },
  });

  await dispatchApi.messageDispatch.dispatchUserMessage({
    content: "Подтверждаю",
    hiddenUserMessage: false,
    session,
    sessionId: session.id,
  });

  assert.deepEqual(recorded, [
    {
      sessionId: session.id,
      source: "typed-fallback",
      stage: "quality_gates",
    },
  ]);
});

test("bootstrap keeps Application Skeleton typed acceptance on its own runner", async () => {
  const { bootstrap, dispatchApi, sessionManager } = createBootstrapHarness();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/bootstrap-application-skeleton",
    "provider-application-skeleton",
    {
      initiativeSlug: "demo",
      stage: "application_skeleton",
    }
  );
  const recorded: Array<{
    readonly sessionId: string;
    readonly source: "typed-fallback" | "ui-button";
    readonly stage: "application_skeleton" | "quality_gates";
  }> = [];

  Object.assign(bootstrap.workflowStateService.managedPostTurnService, {
    handleApplicationSkeletonAcceptContractCommand: (params: {
      readonly sessionId: string;
      readonly source: "typed-fallback" | "ui-button";
    }) => {
      recorded.push({ ...params, stage: "application_skeleton" });
      return Promise.resolve({
        kind: "accepted" as const,
        stage: "application_skeleton" as const,
      });
    },
    handleQualityGatesAcceptContractCommand: (params: {
      readonly sessionId: string;
      readonly source: "typed-fallback" | "ui-button";
    }) => {
      recorded.push({ ...params, stage: "quality_gates" });
      return Promise.resolve({
        kind: "accepted" as const,
        stage: "quality_gates" as const,
      });
    },
  });

  await dispatchApi.messageDispatch.dispatchUserMessage({
    content: "Подтверждаю",
    hiddenUserMessage: false,
    session,
    sessionId: session.id,
  });

  assert.deepEqual(recorded, [
    {
      sessionId: session.id,
      source: "typed-fallback",
      stage: "application_skeleton",
    },
  ]);
});
