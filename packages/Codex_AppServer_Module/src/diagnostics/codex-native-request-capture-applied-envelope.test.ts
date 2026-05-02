import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
  type CodexAppServerProcessProfileKey,
} from "../app-server/process/codex-app-server-process-profile";
import {
  buildCodexNativeRequestCaptureAppliedEnvelope,
  parseProviderHomeRolloutJsonl,
} from "./codex-native-request-capture-applied-envelope";
import { CodexNativeRequestCaptureService } from "./codex-native-request-capture-service";

interface RequestRecord {
  readonly method: string;
  readonly params: unknown;
}

class FakeCodexProcess {
  readonly notifications = new Set<
    (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  >();
  readonly requests: RequestRecord[] = [];

  onNotification(
    listener: (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  ): () => void {
    this.notifications.add(listener);
    return () => {
      this.notifications.delete(listener);
    };
  }

  request<TResult = unknown>(
    method: string,
    params?: unknown
  ): Promise<TResult> {
    this.requests.push({ method, params });
    if (method === "thread/start") {
      return Promise.resolve({
        thread: { id: "diagnostic-thread", path: null },
      } as TResult);
    }
    if (method === "turn/start") {
      queueMicrotask(() => {
        this.emit("turn/completed", { threadId: "diagnostic-thread" });
      });
      return Promise.resolve({ turn: { id: "diagnostic-turn" } } as TResult);
    }
    return Promise.resolve({} as TResult);
  }

  start(): Promise<void> {
    return Promise.resolve();
  }

  stop(): Promise<void> {
    return Promise.resolve();
  }

  private emit(method: string, params: unknown): void {
    for (const listener of this.notifications) {
      listener({ method, params });
    }
  }
}

test("buildCodexNativeRequestCaptureAppliedEnvelope serializes redacted app-server config", () => {
  assert.deepEqual(
    buildCodexNativeRequestCaptureAppliedEnvelope({
      processProfileKey: CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
      providerHomeOverrides: { CODEX_HOME: null },
      threadStartParams: {
        approvalPolicy: "on-request",
        persistExtendedHistory: false,
        sandbox: "workspace-write",
      },
      turnStartParams: { summary: "detailed" },
    }),
    {
      approvalPolicy: "on-request",
      kind: "codex",
      modelReasoningSummary: "detailed",
      persistExtendedHistory: false,
      processProfileKey: CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
      providerHomeOverrides: { CODEX_HOME: null },
      sandbox: "workspace-write",
    }
  );
});

test("parseProviderHomeRolloutJsonl preserves malformed rollout lines as records", () => {
  const records = parseProviderHomeRolloutJsonl(
    `${JSON.stringify({ type: "turn_context" })}\nnot-json\n`
  );

  assert.equal(records.length, 2);
  assert.deepEqual(records[0], { type: "turn_context" });
  assert.equal(
    typeof (records[1] as { readonly parseError?: unknown }).parseError,
    "string"
  );
});

test("CodexNativeRequestCaptureService emits applied envelope before turn start", async () => {
  const process = new FakeCodexProcess();
  const callOrder: string[] = [];
  const envelopes: unknown[] = [];
  let capturedProcessProfileKey: CodexAppServerProcessProfileKey | null = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: ({ processProfileKey }) => {
      capturedProcessProfileKey = processProfileKey;
      return {
        onNotification: (listener) => process.onNotification(listener),
        request: <TResult = unknown>(method: string, params?: unknown) => {
          callOrder.push(method);
          return process.request<TResult>(method, params);
        },
        start: () => process.start(),
        stop: () => process.stop(),
      };
    },
    resolveReasoningSummaryMode: () => "detailed",
    workspace: {
      defaultApprovalMode: "on-request",
      defaultModel: "gpt-5.4",
      defaultReasoningEffort: "medium",
      defaultSandboxMode: "workspace-write",
      workspacePath: "/workspace/default",
    },
  });

  await service.captureNativeRequest({
    captureId: "capture-codex-envelope-test",
    certificateEnv: {},
    certificatePath: "/tmp/capture-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    recordAppliedInputEnvelope: (envelope) => {
      callOrder.push("applied_input_envelope");
      envelopes.push(envelope);
    },
    workspacePath: "/workspace/capture",
  });

  assert.equal(
    capturedProcessProfileKey,
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );
  assert.deepEqual(callOrder, [
    "thread/start",
    "applied_input_envelope",
    "turn/start",
  ]);
  assert.deepEqual(envelopes, [
    {
      approvalPolicy: "on-request",
      kind: "codex",
      modelReasoningSummary: "detailed",
      persistExtendedHistory: false,
      processProfileKey: CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
      providerHomeOverrides: null,
      sandbox: "workspace-write",
    },
  ]);
});
