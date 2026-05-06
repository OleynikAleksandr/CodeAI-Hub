import assert from "node:assert/strict";
import test from "node:test";
import type { NativeRequestCaptureState } from "../../../ui/src/components/settings/use-settings-state-support";
import {
  createNativeRequestCaptureState,
  type NativeRequestCaptureModelId,
  type NativeRequestCaptureScenarioId,
} from "../../../ui/src/components/settings/use-settings-state-support";
import type { SettingsNativeRequestCaptureOptions } from "../../core-stream-message-types";
import type { WorkflowStateSnapshot } from "../../services/workflow-state-client";

type CaptureCall = {
  readonly modelId?: NativeRequestCaptureModelId;
  readonly options?: SettingsNativeRequestCaptureOptions;
  readonly providerId: "claude" | "codex";
};

const installBrowserStubs = (): void => {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: () => {},
        clearTimeout,
        codeaiBridgeConfig: {
          httpUrl: "http://127.0.0.1:8080",
          wsUrl: "ws://127.0.0.1:8080",
        },
        dispatchEvent: () => true,
        setTimeout,
      } as unknown as Window & typeof globalThis,
    });
  }

  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: async () => ({ ok: false }),
  });
};

const createWorkflowState = (
  overrides?: Partial<WorkflowStateSnapshot>
): WorkflowStateSnapshot => ({
  workspaceSlug: "demo-workspace",
  updatedAt: "2026-05-01T10:00:00.000Z",
  stages: {
    description: "idle",
    virtual_simulation: "idle",
    diagram_modules: "idle",
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: true,
      diagram_modules: true,
      application_skeleton: true,
      quality_gates: true,
    },
  },
  ...overrides,
});

const createStateSetter = (): ((
  value:
    | NativeRequestCaptureState
    | ((previous: NativeRequestCaptureState) => NativeRequestCaptureState)
) => void) => {
  let state = createNativeRequestCaptureState();
  return (value) => {
    state = typeof value === "function" ? value(state) : value;
  };
};

const runCapture = async (
  scenarioId: NativeRequestCaptureScenarioId,
  state = createWorkflowState(),
  reasoning?: string | null
): Promise<CaptureCall> => {
  installBrowserStubs();
  const [{ startProjectManagerNativeRequestCapture }, { api }] =
    await Promise.all([
      import("./native-request-capture-runner"),
      import("../../api"),
    ]);

  const originalCaptureNativeRequest = api.captureNativeRequest;
  const originalGetLastSettingsPayload = api.getLastSettingsPayload;
  const originalGetWorkflowState = api.getWorkflowState;

  try {
    const captured = new Promise<CaptureCall>((resolve) => {
      api.captureNativeRequest = (providerId, modelId, options) => {
        resolve({ modelId, options, providerId });
      };
    });
    api.getWorkflowState = async () => state;
    api.getLastSettingsPayload = () => null;

    startProjectManagerNativeRequestCapture({
      context: {
        activeWorkspaceName: "Demo Workspace",
        activeWorkspacePath: "/tmp/demo",
        activeWorkspaceSlug: "demo-workspace",
      },
      modelId: "gpt-5.3-codex",
      providerId: "codex",
      reasoning,
      scenarioId,
      setNativeRequestCapture: createStateSetter(),
    });

    return await captured;
  } finally {
    api.captureNativeRequest = originalCaptureNativeRequest;
    api.getLastSettingsPayload = originalGetLastSettingsPayload;
    api.getWorkflowState = originalGetWorkflowState;
  }
};

test("capture runner bypasses upstream guard for virtual simulation on empty workspace", async () => {
  const captured = await runCapture("virtual_simulation");

  assert.equal(captured.providerId, "codex");
  assert.equal(captured.modelId, "gpt-5.3-codex");
  assert.equal(captured.options?.scenarioId, "virtual_simulation");
  assert.equal(captured.options?.reasoning, undefined);
  assert.equal(
    captured.options?.scenarioInputPath,
    ".codeai-hub/demo-workspace/description/Final_Description.md"
  );
  assert.equal(typeof captured.options?.scenarioPrompt, "string");
  assert.equal((captured.options?.scenarioPrompt ?? "").length > 0, true);
});

test("capture runner bypasses upstream guard for diagram modules on empty workspace", async () => {
  const captured = await runCapture("diagram_modules");

  assert.equal(captured.options?.scenarioId, "diagram_modules");
  assert.equal(
    captured.options?.scenarioInputPath,
    ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md"
  );
  assert.equal(typeof captured.options?.scenarioPrompt, "string");
  assert.equal((captured.options?.scenarioPrompt ?? "").length > 0, true);
});

test("capture runner keeps translation on direct settings capture path", async () => {
  let workflowStateReads = 0;
  const captured = await runCapture("translation", {
    ...createWorkflowState(),
    get updatedAt() {
      workflowStateReads += 1;
      return "2026-05-01T10:00:00.000Z";
    },
  });

  assert.equal(workflowStateReads, 0);
  assert.equal(captured.options?.scenarioId, "translation");
  assert.equal(captured.options?.scenarioLabel, "Translation");
  assert.equal(captured.options?.scenarioPrompt, undefined);
});

test("capture runner forwards explicit reasoning override without changing settings path", async () => {
  const captured = await runCapture(
    "description",
    createWorkflowState(),
    "reasoning-high"
  );

  assert.equal(captured.options?.scenarioId, "description");
  assert.equal(captured.options?.reasoning, "reasoning-high");
});
