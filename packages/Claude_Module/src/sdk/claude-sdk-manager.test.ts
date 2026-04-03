import assert from "node:assert/strict";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import { ClaudeSDKManager } from "./claude-sdk-manager";

const createManager = (): ClaudeSDKManager =>
  new ClaudeSDKManager({
    authManager: {
      getAuthEnvironment: () => ({
        HOME: "/sandbox/provider-home",
      }),
    },
    installer: {
      getExecutablePath: () => "/tmp/claude",
    },
    processor: {
      configureContextUsageReader: () => {
        // noop
      },
    },
    sessions: {},
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "opus",
      workspacePath: "/workspace",
    },
  } as never);

const buildQueryOptions = (
  manager: ClaudeSDKManager,
  session: ActiveSession
): Record<string, unknown> =>
  (
    manager as unknown as {
      buildQueryOptions(payload: {
        readonly outputSchema: Record<string, unknown> | null;
        readonly session: ActiveSession;
        readonly turnOptions?: Record<string, unknown>;
      }): Record<string, unknown>;
    }
  ).buildQueryOptions({
    outputSchema: null,
    session,
  });

test("ClaudeSDKManager keeps Claude memory discovery inside the workspace scope", () => {
  const manager = createManager();

  const options = buildQueryOptions(manager, {
    sessionId: "session-123",
    workspacePath: "/tmp/codeai-workspace",
  } as ActiveSession);

  assert.deepEqual(options.additionalDirectories, ["/tmp/codeai-workspace"]);
  assert.deepEqual(options.settingSources, ["project", "local"]);
  assert.deepEqual(options.env, {
    HOME: "/sandbox/provider-home",
  });
});
