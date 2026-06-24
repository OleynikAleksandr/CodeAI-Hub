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
  claudeDefaultModel: "sonnet",
  claudeContinuityRemainingPercentThreshold: 30,
  continuityPreemptRemainingPercentThreshold: 50,
} as const;

const noop = (): void => {
  // noop
};

const createBootstrapHarness = () => {
  const sessionManager = new SessionManager();
  const events: unknown[] = [];
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
    broadcaster: (event) => {
      events.push(event);
    },
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

  return { bootstrap, dispatchApi, events, sessionManager };
};

test("bootstrap blocks Quality Gates typed acceptance during rewrite", async () => {
  const { dispatchApi, events, sessionManager } = createBootstrapHarness();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/bootstrap-quality-gates",
    "provider-quality-gates",
    {
      initiativeSlug: "demo",
      stage: "quality_gates",
    }
  );
  await dispatchApi.messageDispatch.dispatchUserMessage({
    content: "Подтверждаю",
    hiddenUserMessage: false,
    session,
    sessionId: session.id,
  });

  assert.equal(
    events.some(
      (event) =>
        (event as { readonly payload?: { readonly code?: string } }).payload
          ?.code === "technical_stage_rewrite_in_progress"
    ),
    true
  );
});

test("bootstrap blocks Application Skeleton typed acceptance during rewrite", async () => {
  const { dispatchApi, events, sessionManager } = createBootstrapHarness();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/bootstrap-application-skeleton",
    "provider-application-skeleton",
    {
      initiativeSlug: "demo",
      stage: "application_skeleton",
    }
  );
  await dispatchApi.messageDispatch.dispatchUserMessage({
    content: "Подтверждаю",
    hiddenUserMessage: false,
    session,
    sessionId: session.id,
  });

  assert.equal(
    events.some(
      (event) =>
        (event as { readonly payload?: { readonly code?: string } }).payload
          ?.code === "technical_stage_rewrite_in_progress"
    ),
    true
  );
});
