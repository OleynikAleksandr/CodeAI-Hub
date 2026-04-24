import assert from "node:assert/strict";
import test from "node:test";
import { CodexNativeRequestCaptureService } from "./codex-native-request-capture-service";

interface RequestRecord {
  readonly method: string;
  readonly params: unknown;
}

class FakeCodexProcess {
  readonly requests: RequestRecord[] = [];
  readonly notifications = new Set<
    (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  >();
  started = false;
  stopped = false;

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
        thread: { id: "diagnostic-thread" },
      } as TResult);
    }
    if (method === "turn/start") {
      queueMicrotask(() => {
        this.emit("turn/completed", {
          threadId: "diagnostic-thread",
          turn: { status: "failed" },
        });
      });
      return Promise.resolve({ turn: { id: "diagnostic-turn" } } as TResult);
    }
    return Promise.resolve({} as TResult);
  }

  start(): Promise<void> {
    this.started = true;
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.stopped = true;
    return Promise.resolve();
  }

  private emit(method: string, params: unknown): void {
    for (const listener of this.notifications) {
      listener({ method, params });
    }
  }
}

test("CodexNativeRequestCaptureService starts an isolated app-server process with proxy and certificate env", async () => {
  const processes: FakeCodexProcess[] = [];
  let capturedEnvironment: Readonly<Record<string, string>> | null = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: ({ environment }) => {
      capturedEnvironment = environment;
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
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
    captureId: "capture-codex-test",
    certificateEnv: {
      SSL_CERT_FILE: "/tmp/capture-ca.pem",
    },
    certificatePath: "/tmp/fallback-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    workspacePath: "/workspace/capture",
  });

  assert.equal(processes.length, 1);
  assert.equal(processes[0]?.started, true);
  assert.equal(processes[0]?.stopped, true);
  assert.deepEqual(capturedEnvironment, {
    ALL_PROXY: "http://127.0.0.1:4567",
    HTTP_PROXY: "http://127.0.0.1:4567",
    HTTPS_PROXY: "http://127.0.0.1:4567",
    NODE_EXTRA_CA_CERTS: "/tmp/fallback-ca.pem",
    REQUESTS_CA_BUNDLE: "/tmp/fallback-ca.pem",
    SSL_CERT_FILE: "/tmp/capture-ca.pem",
  });

  assert.deepEqual(processes[0]?.requests, [
    {
      method: "thread/start",
      params: {
        cwd: "/workspace/capture",
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
        model: "gpt-5.4",
        persistExtendedHistory: false,
      },
    },
    {
      method: "turn/start",
      params: {
        threadId: "diagnostic-thread",
        input: [
          {
            type: "text",
            text: "diagnostic probe",
            text_elements: [],
          },
        ],
        cwd: "/workspace/capture",
        model: "gpt-5.4",
        effort: "medium",
        summary: "detailed",
      },
    },
  ]);
});

test("CodexNativeRequestCaptureService mirrors selected model and applied reasoning config", async () => {
  const processes: FakeCodexProcess[] = [];
  const service = new CodexNativeRequestCaptureService({
    processFactory: () => {
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
    },
    resolveReasoningSummaryMode: () => "none",
    workspace: {
      defaultApprovalMode: "on-request",
      defaultModel: "gpt-5.4",
      defaultReasoningEffort: "medium",
      defaultSandboxMode: "workspace-write",
      workspacePath: "/workspace/default",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "gpt-5.3-codex",
      providerId: "codexCli",
      reasoningEffort: "xhigh",
      source: "switch_request",
    },
    captureId: "capture-codex-app-config-test",
    certificateEnv: {},
    certificatePath: "/tmp/fallback-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    selectedModelId: "gpt-5.4-mini",
    workspacePath: "/workspace/capture",
  });

  const requests = processes[0]?.requests;
  assert.equal(requests?.[0]?.method, "thread/start");
  assert.equal(
    (requests?.[0]?.params as { model?: string }).model,
    "gpt-5.3-codex"
  );
  assert.equal(requests?.[1]?.method, "turn/start");
  assert.deepEqual(requests?.[1]?.params, {
    threadId: "diagnostic-thread",
    input: [
      {
        type: "text",
        text: "diagnostic probe",
        text_elements: [],
      },
    ],
    cwd: "/workspace/capture",
    model: "gpt-5.3-codex",
    effort: "xhigh",
    summary: "none",
  });
});
