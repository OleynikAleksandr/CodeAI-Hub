import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CODEX_DEFAULT_PROCESS_PROFILE_KEY,
  CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
} from "../app-server/process/codex-app-server-process-profile";
import { CodexNativeRequestCaptureService } from "./codex-native-request-capture-service";
import {
  buildCodexNativeTranslationCapturePromptProfile,
  buildCodexNativeTranslationThreadStartParams,
  buildCodexNativeTranslationTurnStartParams,
  isCodexNativeTranslationCapture,
} from "./codex-native-translation-capture-profile";

const EARLY_ARCHITECTURE_WORKFLOW_PATTERN = /early architecture workflow/;
const TRANSLATION_ENGINE_INSTRUCTIONS_PATTERN = /precise translation engine/;
const TRANSLATION_PROMPT_TARGET_PATTERN = /Translate the source text into es/;
const TRANSLATION_SAMPLE_PATTERN =
  /CodeAI Hub native request capture translation sample/;

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
  threadPath: string | null = null;

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
        thread: { id: "diagnostic-thread", path: this.threadPath },
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

test("Codex native translation capture builders document the translation-only baseline", () => {
  assert.equal(
    isCodexNativeTranslationCapture({ invocationPurpose: "translation" }),
    true
  );
  assert.equal(
    isCodexNativeTranslationCapture({ scenarioId: "translation" }),
    true
  );
  assert.equal(
    isCodexNativeTranslationCapture({ scenarioId: "description" }),
    false
  );

  const promptProfile = buildCodexNativeTranslationCapturePromptProfile(
    "gpt-5.3-codex-spark"
  );
  const threadStart = buildCodexNativeTranslationThreadStartParams({
    promptProfile,
    workspacePath: "/workspace/capture",
  });
  assert.deepEqual(threadStart, {
    approvalPolicy: "never",
    baseInstructions: promptProfile.baseInstructions,
    config: {
      project_doc_max_bytes: 0,
    },
    cwd: "/workspace/capture",
    model: "gpt-5.3-codex-spark",
    persistExtendedHistory: false,
    sandbox: "read-only",
  });
  assert.match(
    promptProfile.baseInstructions,
    TRANSLATION_ENGINE_INSTRUCTIONS_PATTERN
  );

  const turnStart = buildCodexNativeTranslationTurnStartParams({
    promptProfile,
    threadId: "diagnostic-thread",
    workspacePath: "/workspace/capture",
  });
  assert.deepEqual(turnStart, {
    cwd: "/workspace/capture",
    effort: "low",
    input: [
      {
        text: promptProfile.userPrompt,
        text_elements: [],
        type: "text",
      },
    ],
    model: "gpt-5.3-codex-spark",
    summary: "none",
    threadId: "diagnostic-thread",
  });
  assert.match(promptProfile.userPrompt, TRANSLATION_PROMPT_TARGET_PATTERN);
  assert.match(promptProfile.userPrompt, TRANSLATION_SAMPLE_PATTERN);
});

test("CodexNativeRequestCaptureService starts an isolated app-server process with proxy and certificate env", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codex-native-capture-test-")
  );
  const rolloutPath = path.join(tempDir, "rollout.jsonl");
  await writeFile(
    rolloutPath,
    `${JSON.stringify({
      type: "turn_context",
      payload: {
        user_instructions: "# AGENTS.md instructions\nFull project text",
      },
    })}\n`,
    "utf8"
  );
  const processes: FakeCodexProcess[] = [];
  const diagnosticRecords: { kind: string; payload: unknown }[] = [];
  let capturedEnvironment: Readonly<Record<string, string>> | null = null;
  let capturedProcessProfileKey: string | null = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: ({ environment, processProfileKey }) => {
      capturedEnvironment = environment;
      capturedProcessProfileKey = processProfileKey;
      const process = new FakeCodexProcess();
      process.threadPath = rolloutPath;
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

  try {
    await service.captureNativeRequest({
      captureId: "capture-codex-test",
      certificateEnv: {
        SSL_CERT_FILE: "/tmp/capture-ca.pem",
      },
      certificatePath: "/tmp/fallback-ca.pem",
      probePrompt: "diagnostic probe",
      proxyUrl: "http://127.0.0.1:4567",
      recordDiagnosticContext: (record) => {
        diagnosticRecords.push(record);
      },
      workflowPrompt: "workflow prompt",
      workspacePath: "/workspace/capture",
    });
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }

  assert.equal(processes.length, 1);
  assert.equal(
    capturedProcessProfileKey,
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );
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
  const requests = processes[0]?.requests ?? [];
  const threadStartParams = requests[0]?.params as {
    readonly baseInstructions?: string;
  };
  assert.match(
    threadStartParams.baseInstructions ?? "",
    EARLY_ARCHITECTURE_WORKFLOW_PATTERN
  );
  assert.deepEqual(requests, [
    {
      method: "thread/start",
      params: {
        cwd: "/workspace/capture",
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
        model: "gpt-5.4",
        persistExtendedHistory: false,
        baseInstructions: threadStartParams.baseInstructions,
        config: {
          project_doc_max_bytes: 0,
        },
      },
    },
    {
      method: "turn/start",
      params: {
        threadId: "diagnostic-thread",
        input: [
          {
            type: "text",
            text: "workflow prompt",
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
  assert.deepEqual(
    diagnosticRecords.map((record) => record.kind),
    [
      "codex_app_server_thread_start_request",
      "codex_app_server_thread_start_response",
      "codex_app_server_turn_start_request",
      "codex_app_server_turn_start_response",
      "codex_provider_home_rollout_context",
    ]
  );
  const turnStart = diagnosticRecords.find(
    (record) => record.kind === "codex_app_server_turn_start_request"
  );
  assert.ok(turnStart);
  assert.deepEqual(turnStart.payload, {
    threadId: "diagnostic-thread",
    input: [
      {
        type: "text",
        text: "workflow prompt",
        text_elements: [],
      },
    ],
    cwd: "/workspace/capture",
    model: "gpt-5.4",
    effort: "medium",
    summary: "detailed",
  });
  const rolloutContext = diagnosticRecords.find(
    (record) => record.kind === "codex_provider_home_rollout_context"
  );
  assert.ok(rolloutContext);
  assert.deepEqual(rolloutContext.payload, {
    path: rolloutPath,
    recordCount: 1,
    records: [
      {
        type: "turn_context",
        payload: {
          user_instructions: "# AGENTS.md instructions\nFull project text",
        },
      },
    ],
  });
});

test("CodexNativeRequestCaptureService captures vanilla without workflow overrides", async () => {
  const processes: FakeCodexProcess[] = [];
  let capturedProcessProfileKey: string | null = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: ({ processProfileKey }) => {
      capturedProcessProfileKey = processProfileKey;
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
    captureMode: "vanilla",
    certificateEnv: {},
    certificatePath: "/tmp/fallback-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    selectedModelId: "gpt-5.4-mini",
    workspacePath: "/workspace/capture",
  });

  assert.equal(capturedProcessProfileKey, CODEX_DEFAULT_PROCESS_PROFILE_KEY);
  const requests = processes[0]?.requests;
  assert.equal(requests?.[0]?.method, "thread/start");
  const threadStart = requests?.[0]?.params as Record<string, unknown>;
  assert.equal(threadStart.model, "gpt-5.3-codex");
  assert.equal("baseInstructions" in threadStart, false);
  assert.equal("config" in threadStart, false);
  assert.equal(threadStart.persistExtendedHistory, false);
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

test("CodexNativeRequestCaptureService uses translation profile for translation capture", async () => {
  const processes: FakeCodexProcess[] = [];
  let capturedProcessProfileKey: string | null = null;
  const service = new CodexNativeRequestCaptureService({
    processFactory: ({ processProfileKey }) => {
      capturedProcessProfileKey = processProfileKey;
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
    },
    workspace: {
      defaultApprovalMode: "on-request",
      defaultModel: "gpt-5.4",
      defaultReasoningEffort: "medium",
      defaultSandboxMode: "workspace-write",
      workspacePath: "/workspace/default",
    },
  });

  await service.captureNativeRequest({
    captureId: "capture-codex-translation-test",
    certificateEnv: {},
    certificatePath: "/tmp/fallback-ca.pem",
    invocationPurpose: "translation",
    probePrompt: "diagnostic probe must not be used",
    proxyUrl: "http://127.0.0.1:4567",
    scenarioId: "translation",
    selectedModelId: "gpt-5.4-mini",
    workflowPrompt: "workflow prompt must not be used",
    workspacePath: "/workspace/capture",
  });

  assert.equal(
    capturedProcessProfileKey,
    CODEX_TRANSLATION_PROCESS_PROFILE_KEY
  );
  const requests = processes[0]?.requests ?? [];
  const threadStart = requests[0]?.params as Record<string, unknown>;
  assert.equal(threadStart.approvalPolicy, "never");
  assert.equal(threadStart.sandbox, "read-only");
  assert.equal(threadStart.persistExtendedHistory, false);
  assert.equal(threadStart.model, "gpt-5.4-mini");
  assert.deepEqual(threadStart.config, { project_doc_max_bytes: 0 });
  assert.match(
    String(threadStart.baseInstructions),
    TRANSLATION_ENGINE_INSTRUCTIONS_PATTERN
  );
  const turnStart = requests[1]?.params as Record<string, unknown>;
  const input = turnStart.input as readonly { readonly text: string }[];
  assert.equal(turnStart.model, "gpt-5.4-mini");
  assert.equal(turnStart.effort, "low");
  assert.equal(turnStart.summary, "none");
  assert.match(input[0]?.text ?? "", TRANSLATION_PROMPT_TARGET_PATTERN);
  assert.match(input[0]?.text ?? "", TRANSLATION_SAMPLE_PATTERN);
  assert.equal(
    input[0]?.text.includes("workflow prompt must not be used"),
    false
  );
  assert.equal(
    input[0]?.text.includes("diagnostic probe must not be used"),
    false
  );
});

test("CodexNativeRequestCaptureService sends summary none for Codex Spark", async () => {
  const processes: FakeCodexProcess[] = [];
  const service = new CodexNativeRequestCaptureService({
    processFactory: () => {
      const process = new FakeCodexProcess();
      processes.push(process);
      return process;
    },
    resolveReasoningSummaryMode: () => "detailed",
    workspace: {
      defaultApprovalMode: "on-request",
      defaultModel: "gpt-5.3-codex-spark",
      defaultReasoningEffort: "medium",
      defaultSandboxMode: "workspace-write",
      workspacePath: "/workspace/default",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "gpt-5.3-codex-spark",
      providerId: "codexCli",
      reasoningEffort: "medium",
      source: "settings_snapshot",
    },
    captureId: "capture-codex-spark-test",
    certificateEnv: {},
    certificatePath: "/tmp/fallback-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    workspacePath: "/workspace/capture",
  });

  const requests = processes[0]?.requests;
  assert.equal(requests?.[1]?.method, "turn/start");
  const params = requests?.[1]?.params as Record<string, unknown>;
  assert.equal(params.model, "gpt-5.3-codex-spark");
  assert.equal(params.effort, "medium");
  assert.equal(params.summary, "none");
});
