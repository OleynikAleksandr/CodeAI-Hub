import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import type { Session } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import {
  UnifiedSessionStorage,
  WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
} from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { SessionRequestHandlerContinuityRoot } from "./session-request-handler-continuity-root";

const DEVELOPMENT_TREE_SUFFIX_RE =
  /^codex-7846f548-72ec-4a72-a9f5-d27ef3c019bb-project-manager-workflow-and-artifact-ui-workflow-step-controller$/;
const GENERIC_DEVELOPMENT_TREE_SUFFIX_RE = /development-tree$/;
const WORKSPACE_SLUG = "demo-workspace";
const MESSAGE_CONTENT_RE = /hello from workflow/u;

const createContinuityRoot = (): SessionRequestHandlerContinuityRoot =>
  new SessionRequestHandlerContinuityRoot({
    logger: new Logger("error"),
    sessionStorage: {} as UnifiedSessionStorage,
  });

const createWorkflowSession = (workspaceRoot: string): Session => ({
  continuationIndex: 1,
  continuationParentId: null,
  createdAt: "2026-05-25T00:00:00.000Z",
  id: "session-1",
  initiativeSlug: WORKSPACE_SLUG,
  messages: [],
  providerId: "codexCli",
  providerSessionId: "provider-session-1",
  providerSessionStatus: "ready",
  runSlug: null,
  stage: "description",
  title: "Workflow session",
  updatedAt: "2026-05-25T00:00:00.000Z",
  workspacePath: workspaceRoot,
});

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

test("development tree root ids use node path suffix instead of generic run slug", async () => {
  const rootSessionId =
    await createContinuityRoot().resolveContinuityRootSessionId({
      providerId: "codexCli",
      rootSessionIdOverride: null,
      sessionId: "7846f548-72ec-4a72-a9f5-d27ef3c019bb",
      workspaceRoot: "/workspace",
      context: {
        initiativeSlug: "demo-workspace",
        providerSessionId: null,
        runSlug: "development-tree",
        stage:
          "development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/workflow-step-controller",
      },
    });

  assert.match(rootSessionId, DEVELOPMENT_TREE_SUFFIX_RE);
  assert.doesNotMatch(rootSessionId, GENERIC_DEVELOPMENT_TREE_SUFFIX_RE);
});

test("workflow unified sessions are stored inside the workspace runtime capsule", async () => {
  const globalRoot = await mkdtemp(path.join(tmpdir(), "global-sessions-"));
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "workflow-sessions-")
  );
  try {
    const storage = new UnifiedSessionStorage({
      rootDirectory: globalRoot,
      logger: new Logger("error"),
    });
    const session = createWorkflowSession(workspaceRoot);
    storage.register(session);

    await storage.appendMessage(session.id, {
      content: "hello from workflow",
      id: "message-1",
      role: "assistant",
      sessionId: session.id,
      timestamp: "2026-05-25T00:01:00.000Z",
    });

    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const capsuleHistoryPath = buildSessionFilePath({
      rootDirectory: capsule.sessionsRoot.absolutePath,
      workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
      provider: session.providerId,
      sessionId: sanitizeWorkspaceSlug(session.providerSessionId ?? session.id),
    });
    const legacyHistoryPath = buildSessionFilePath({
      rootDirectory: globalRoot,
      workspaceSlug: sanitizeWorkspaceSlug(workspaceRoot),
      provider: session.providerId,
      sessionId: sanitizeWorkspaceSlug(session.providerSessionId ?? session.id),
    });

    assert.match(
      await readFile(capsuleHistoryPath, "utf8"),
      MESSAGE_CONTENT_RE
    );
    assert.equal(await fileExists(legacyHistoryPath), false);
  } finally {
    await rm(globalRoot, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("legacy description root promotion also targets capsule workflow history", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "workflow-promote-"));
  const promoteCalls: unknown[] = [];
  try {
    const root = new SessionRequestHandlerContinuityRoot({
      logger: new Logger("error"),
      sessionStorage: {
        promoteHistoryFile: (options: unknown) => {
          promoteCalls.push(options);
        },
      } as UnifiedSessionStorage,
    });

    const normalizedRootSessionId =
      await root.maybePromoteLegacyDescriptionAgentRootId({
        providerId: "codexCli",
        rootSessionId: "demo-agent",
        stageId: "description",
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(normalizedRootSessionId, "demo-description");
    assert.deepEqual(promoteCalls, [
      {
        workspaceSlug: sanitizeWorkspaceSlug(workspaceRoot),
        providerId: "codexCli",
        fromHistorySessionId: "demo-agent",
        toHistorySessionId: "demo-description",
      },
      {
        rootDirectory: capsule.sessionsRoot.absolutePath,
        workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
        providerId: "codexCli",
        fromHistorySessionId: "demo-agent",
        toHistorySessionId: "demo-description",
      },
    ]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
