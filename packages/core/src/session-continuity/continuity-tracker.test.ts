import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../session-manager";
import { Logger } from "../telemetry/logger";
import { ContinuityTracker } from "./continuity-tracker";
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
  createdAt: "2026-04-28T12:00:00.000Z",
  updatedAt: "2026-04-28T12:00:00.000Z",
  messages: [],
  providerSessionId: "provider-session-1",
  providerSessionStatus: "ready",
  modelBinding: {
    key: "provider\u001fcodexCli\u001fsession\u001fsession-1",
    providerId: "codexCli",
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "settings_default",
    boundAt: "2026-04-28T12:00:00.000Z",
    updatedAt: "2026-04-28T12:00:00.000Z",
  },
});

test("ContinuityTracker persists session model binding on outbound tracking", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "continuity-model-binding-")
  );
  const session = createSession(workspaceRoot);
  const tracker = new ContinuityTracker({
    logger: new Logger("error"),
    clock: () => "2026-04-28T12:01:00.000Z",
    sessionLookup: (sessionId) =>
      sessionId === session.id ? session : undefined,
  });

  await tracker.ensureTrackedOnOutboundMessage({
    sessionId: session.id,
    providerSessionId: "provider-session-1",
  });

  const chainPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "workspace",
    "continuity",
    "description",
    "session-1",
    "chain.json"
  );
  const saved = JSON.parse(await readFile(chainPath, "utf8")) as {
    readonly segments: readonly {
      readonly modelBinding?: { readonly modelId?: string };
    }[];
  };

  assert.equal(
    saved.segments[0]?.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );

  const binding = await SessionContinuityFacade.readLastModelBindingSnapshot({
    workspaceRoot,
    workspaceSlug: "workspace",
    providerSessionId: "provider-session-1",
  });
  assert.equal(binding?.modelId, "gpt-5.3-codex-spark reasoning:xhigh");
});
