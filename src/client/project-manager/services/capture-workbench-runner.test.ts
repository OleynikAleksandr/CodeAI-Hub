import assert from "node:assert/strict";
import test from "node:test";
import type {
  IncomingMessage,
  SettingsNativeRequestCaptureModelId,
  SettingsNativeRequestCaptureOptions,
  SettingsNativeRequestCaptureProviderId,
  SettingsNativeRequestCaptureResultPayload,
} from "../core-stream-message-types";
import type {
  CaptureWorkbenchRunnerTransport,
  CaptureWorkbenchScenarioPromptBuilder,
} from "./capture-workbench-runner";

type CaptureCall = {
  readonly modelId?: SettingsNativeRequestCaptureModelId;
  readonly options?: SettingsNativeRequestCaptureOptions;
  readonly providerId: SettingsNativeRequestCaptureProviderId;
};

const SELECTION = {
  step: "description",
  provider: "claude",
  model: "sonnet",
  reasoning: "thinking-high",
};

const installBrowserStubs = (): void => {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        clearTimeout,
        codeaiBridgeConfig: {
          httpUrl: "http://127.0.0.1:8080",
          wsUrl: "ws://127.0.0.1:8080",
        },
        dispatchEvent: () => true,
        removeEventListener: () => undefined,
        setTimeout,
      } as unknown as Window & typeof globalThis,
    });
  }
};

const loadRunnerModule = async () => {
  installBrowserStubs();
  return await import("./capture-workbench-runner");
};

const createHarness = (
  resultFactory: (call: CaptureCall) => SettingsNativeRequestCaptureResultPayload
): {
  readonly captureCalls: readonly CaptureCall[];
  readonly transport: CaptureWorkbenchRunnerTransport;
} => {
  const listeners = new Set<(message: IncomingMessage) => void>();
  const captureCalls: CaptureCall[] = [];
  const emit = (message: IncomingMessage): void => {
    for (const listener of listeners) {
      listener(message);
    }
  };

  return {
    captureCalls,
    transport: {
      captureNativeRequest: (providerId, modelId, options) => {
        const call = { modelId, options, providerId };
        captureCalls.push(call);
        queueMicrotask(() => {
          emit({
            type: "settings:native-request-capture:result",
            payload: resultFactory(call),
          } as IncomingMessage);
        });
      },
      getLastSettingsPayload: () => null,
      getWorkflowState: async () => null,
      onCoreEvent: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
  };
};

test("CaptureWorkbenchRunner builds workflow capture and returns artifact records", async () => {
  const { createCaptureWorkbenchRunner } = await loadRunnerModule();
  const harness = createHarness((call) =>
    captureResult(call, {
      jsonlPath: "/tmp/description.jsonl",
      markdownPath: "/tmp/description.md",
    })
  );
  const artifactReads: string[] = [];
  const promptBuilder: CaptureWorkbenchScenarioPromptBuilder = async (
    params
  ) => {
    assert.equal(params.bypassUpstreamGuard, true);
    assert.equal(params.scenarioId, "description");
    assert.equal(params.workspacePath, "/workspace/demo");
    assert.equal(params.workspaceSlug, "demo");
    return {
      artifactLanguage: "en",
      inputPath: ".codeai-hub/demo/description/questionnaire.md",
      prompt: "Capture prompt",
      promptPath: "/contracts/description.md",
      scenarioId: "description",
      scenarioLabel: "Description",
      targetAbsolutePath: "/workspace/demo/.codeai-hub/demo/description/input.md",
      targetRelativePath: ".codeai-hub/demo/description/input.md",
    };
  };
  const runner = createCaptureWorkbenchRunner(
    {
      artifactReader: {
        readArtifactRecords: async (jsonlPath) => {
          artifactReads.push(jsonlPath);
          return [{ type: "capture_start", releaseVersion: "1.2.124" }];
        },
      },
      transport: harness.transport,
    },
    { scenarioPromptBuilder: promptBuilder }
  );

  const result = await runner.runManagedCapture({
    context: {
      workspaceName: "Demo",
      workspacePath: "/workspace/demo",
      workspaceSlug: "demo",
    },
    selection: SELECTION,
  });

  assert.equal(harness.captureCalls.length, 1);
  assert.equal(harness.captureCalls[0]?.providerId, "claude");
  assert.equal(harness.captureCalls[0]?.modelId, "sonnet");
  assert.deepEqual(harness.captureCalls[0]?.options, {
    reasoning: "thinking-high",
    scenarioId: "description",
    scenarioInputPath: ".codeai-hub/demo/description/questionnaire.md",
    scenarioLabel: "Description",
    scenarioPrompt: "Capture prompt",
    scenarioTargetPath: ".codeai-hub/demo/description/input.md",
    workspacePath: "/workspace/demo",
  });
  assert.deepEqual(artifactReads, ["/tmp/description.jsonl"]);
  assert.deepEqual(result.records, [
    { type: "capture_start", releaseVersion: "1.2.124" },
  ]);
  assert.deepEqual(result.slot, SELECTION);
});

test("CaptureWorkbenchRunner keeps translation on the direct capture path", async () => {
  const { createCaptureWorkbenchRunner } = await loadRunnerModule();
  const harness = createHarness((call) =>
    captureResult(call, {
      jsonlPath: "/tmp/translation.jsonl",
      markdownPath: "/tmp/translation.md",
    })
  );
  let promptCalls = 0;
  const runner = createCaptureWorkbenchRunner(
    {
      artifactReader: {
        readArtifactRecords: async () => [{ type: "capture_start" }],
      },
      transport: harness.transport,
    },
    {
      scenarioPromptBuilder: async () => {
        promptCalls += 1;
        throw new Error("Translation should not build a workflow prompt.");
      },
    }
  );

  await runner.runManagedCapture({
    context: {},
    selection: {
      step: "translation",
      provider: "codex",
      model: "gpt-5.3-codex",
      reasoning: "reasoning-high",
    },
  });

  assert.equal(promptCalls, 0);
  assert.deepEqual(harness.captureCalls[0]?.options, {
    reasoning: "reasoning-high",
    scenarioId: "translation",
    scenarioLabel: "Translation",
  });
});

test("CaptureWorkbenchRunner marks vanilla captures without changing managed payloads", async () => {
  const { createCaptureWorkbenchRunner } = await loadRunnerModule();
  const harness = createHarness((call) =>
    captureResult(call, {
      jsonlPath: "/tmp/description.jsonl",
      markdownPath: "/tmp/description.md",
    })
  );
  const runner = createCaptureWorkbenchRunner(
    {
      artifactReader: {
        readArtifactRecords: async () => [{ type: "capture_start" }],
      },
      transport: harness.transport,
    },
    { scenarioPromptBuilder: workflowPromptBuilder }
  );
  const input = {
    context: {
      workspacePath: "/workspace/demo",
      workspaceSlug: "demo",
    },
    selection: SELECTION,
  };

  await runner.runManagedCapture(input);
  await runner.runVanillaCapture(input);

  assert.equal(harness.captureCalls[0]?.options?.captureMode, undefined);
  assert.equal(harness.captureCalls[1]?.options?.captureMode, "vanilla");
  assert.equal(harness.captureCalls[1]?.options?.scenarioId, "description");
});

test("CaptureWorkbenchRunner binds workflow-state transport for API receivers", async () => {
  const { createCaptureWorkbenchRunner } = await loadRunnerModule();
  const harness = createHarness((call) =>
    captureResult(call, {
      jsonlPath: "/tmp/description.jsonl",
      markdownPath: "/tmp/description.md",
    })
  );
  let observedHttpUrl: string | null = null;
  const transport = {
    ...harness.transport,
    getHttpUrl: () => "http://127.0.0.1:8080",
    getWorkflowState: async function (
      workspaceSlug: string,
      workspacePath?: string
    ) {
      observedHttpUrl =
        (this as { getHttpUrl?: () => string }).getHttpUrl?.() ?? null;
      assert.equal(workspaceSlug, "demo");
      assert.equal(workspacePath, "/workspace/demo");
      return null;
    },
  };
  const promptBuilder: CaptureWorkbenchScenarioPromptBuilder = async (
    params
  ) => {
    await params.getWorkflowState(params.workspaceSlug, params.workspacePath);
    return workflowPromptBuilder(params);
  };
  const runner = createCaptureWorkbenchRunner(
    {
      artifactReader: {
        readArtifactRecords: async () => [{ type: "capture_start" }],
      },
      transport: transport as CaptureWorkbenchRunnerTransport,
    },
    { scenarioPromptBuilder: promptBuilder }
  );

  await runner.runManagedCapture({
    context: {
      workspacePath: "/workspace/demo",
      workspaceSlug: "demo",
    },
    selection: SELECTION,
  });

  assert.equal(observedHttpUrl, "http://127.0.0.1:8080");
});

test("CaptureWorkbenchRunner rejects failed capture before reading artifacts", async () => {
  const { createCaptureWorkbenchRunner } = await loadRunnerModule();
  const harness = createHarness((call) =>
    captureResult(call, {
      error: "Capture denied",
      ok: false,
    })
  );
  let artifactReads = 0;
  const runner = createCaptureWorkbenchRunner(
    {
      artifactReader: {
        readArtifactRecords: async () => {
          artifactReads += 1;
          return [];
        },
      },
      transport: harness.transport,
    },
    { scenarioPromptBuilder: workflowPromptBuilder }
  );

  await assert.rejects(
    () =>
      runner.runManagedCapture({
        context: {
          workspacePath: "/workspace/demo",
          workspaceSlug: "demo",
        },
        selection: SELECTION,
      }),
    /Capture denied/
  );
  assert.equal(artifactReads, 0);
});

const workflowPromptBuilder: CaptureWorkbenchScenarioPromptBuilder =
  async () => ({
    artifactLanguage: "en",
    inputPath: ".codeai-hub/demo/description/questionnaire.md",
    prompt: "Capture prompt",
    promptPath: "/contracts/description.md",
    scenarioId: "description",
    scenarioLabel: "Description",
    targetAbsolutePath: "/workspace/demo/.codeai-hub/demo/description/input.md",
    targetRelativePath: ".codeai-hub/demo/description/input.md",
  });

const captureResult = (
  call: CaptureCall,
  overrides: Partial<SettingsNativeRequestCaptureResultPayload>
): SettingsNativeRequestCaptureResultPayload => ({
  jsonlPath: "/tmp/capture.jsonl",
  markdownPath: "/tmp/capture.md",
  modelId: call.modelId,
  ok: true,
  providerId: call.providerId,
  ...overrides,
});
