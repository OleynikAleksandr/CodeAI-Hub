import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../session-manager";
import { Logger } from "../telemetry/logger";
import { SessionContinuityFacade } from "./session-continuity-facade";

const createSession = (workspaceRoot: string): Session => ({
  id: "session-1",
  providerId: "codexCli",
  workspacePath: workspaceRoot,
  initiativeSlug: "workspace",
  stage: "description",
  runSlug: "collector",
  continuationParentId: null,
  continuationIndex: 1,
  title: "Session",
  createdAt: "2026-04-29T12:00:00.000Z",
  updatedAt: "2026-04-29T12:00:00.000Z",
  messages: [],
  providerSessionId: "provider-session-1",
  providerSessionStatus: "ready",
});

test("SessionContinuityFacade retries legacy handoff after prompt send failure", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "continuity-handoff-retry-")
  );
  const session = createSession(workspaceRoot);
  let sendAttempts = 0;
  const facade = new SessionContinuityFacade({
    logger: new Logger("error"),
    clock: () => "2026-04-29T12:01:00.000Z",
    enableLegacyHandoff: true,
    remainingRatioThreshold: 0.25,
    sessionLookup: (sessionId) =>
      sessionId === session.id ? session : undefined,
    callbacks: {
      createSession: () => Promise.resolve(null),
      sendMessage: () => {
        sendAttempts += 1;
        return Promise.reject(new Error("handoff prompt failed"));
      },
    },
  });

  const usageEvent = {
    tokenUsage: {
      used: 90,
      limit: 100,
    },
    providerSessionId: "provider-session-1",
  };

  await facade.handleProviderEvent(session.id, usageEvent);
  await facade.handleProviderEvent(session.id, usageEvent);

  assert.equal(sendAttempts, 2);
});
