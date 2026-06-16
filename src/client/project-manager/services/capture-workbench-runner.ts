import type {
  IncomingMessage,
  SettingsLoadedPayload,
  SettingsNativeRequestCaptureModelId,
  SettingsNativeRequestCaptureOptions,
  SettingsNativeRequestCaptureProviderId,
  SettingsNativeRequestCaptureResultPayload,
  SettingsNativeRequestCaptureScenarioId,
} from "../core-stream-message-types";
import type {
  NativeRequestCaptureScenarioPrompt,
  NativeRequestCaptureScenarioId as WorkflowCaptureScenarioId,
} from "./native-request-capture-scenario-prompt";
import type { WorkbenchSelectionState } from "./workbench-bridge-types";
import type { WorkbenchSlotKey } from "./workbench-index-store";
import type { WorkbenchStateClientApi } from "./workbench-state-client";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const DEFAULT_TIMEOUT_MS = 300_000;

type WorkflowStateGetter = (
  workspaceSlug: string,
  workspacePath?: string
) => Promise<WorkflowStateSnapshot | null>;

interface CaptureWorkbenchScenarioPromptParams {
  readonly bypassUpstreamGuard?: boolean;
  readonly getWorkflowState: WorkflowStateGetter;
  readonly scenarioId: WorkflowCaptureScenarioId;
  readonly settingsPayload?: SettingsLoadedPayload | null;
  readonly workspaceName?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export type CaptureWorkbenchScenarioPromptBuilder = (
  params: CaptureWorkbenchScenarioPromptParams
) => Promise<NativeRequestCaptureScenarioPrompt>;

export interface CaptureWorkbenchRunnerTransport {
  readonly captureNativeRequest: (
    providerId: SettingsNativeRequestCaptureProviderId,
    modelId?: SettingsNativeRequestCaptureModelId,
    options?: SettingsNativeRequestCaptureOptions
  ) => void;
  readonly getLastSettingsPayload: () => SettingsLoadedPayload | null;
  readonly getWorkflowState: WorkflowStateGetter;
  readonly onCoreEvent: (
    listener: (message: IncomingMessage) => void
  ) => () => void;
}

export interface CaptureWorkbenchRunnerContext {
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
}

export interface CaptureWorkbenchRunInput {
  readonly context: CaptureWorkbenchRunnerContext;
  readonly selection: WorkbenchSelectionState;
}

export interface CaptureWorkbenchRunResult {
  readonly captureResult: SettingsNativeRequestCaptureResultPayload;
  readonly records: readonly unknown[];
  readonly slot: WorkbenchSlotKey;
}

export interface CaptureWorkbenchRunnerApi {
  runManagedCapture(input: CaptureWorkbenchRunInput): Promise<CaptureWorkbenchRunResult>;
}

class CaptureWorkbenchRunner implements CaptureWorkbenchRunnerApi {
  readonly #artifactReader: Pick<WorkbenchStateClientApi, "readArtifactRecords">;
  readonly #scenarioPromptBuilder: CaptureWorkbenchScenarioPromptBuilder | undefined;
  readonly #timeoutMs: number;
  readonly #transport: CaptureWorkbenchRunnerTransport;

  constructor(
    transport: CaptureWorkbenchRunnerTransport,
    artifactReader: Pick<WorkbenchStateClientApi, "readArtifactRecords">,
    options: {
      readonly scenarioPromptBuilder?: CaptureWorkbenchScenarioPromptBuilder;
      readonly timeoutMs?: number;
    } = {}
  ) {
    this.#artifactReader = artifactReader;
    this.#scenarioPromptBuilder = options.scenarioPromptBuilder;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#transport = transport;
  }

  async runManagedCapture(
    input: CaptureWorkbenchRunInput
  ): Promise<CaptureWorkbenchRunResult> {
    const request = await this.#buildRequest(input);
    const captureResult = await this.#waitForCaptureResult(
      request,
      () => {
        this.#transport.captureNativeRequest(
          request.providerId,
          request.modelId,
          request.options
        );
      }
    );
    if (!captureResult.ok) {
      throw new Error(describeCaptureFailure(captureResult));
    }
    const jsonlPath = readNonEmptyString(captureResult.jsonlPath);
    if (!jsonlPath) {
      throw new Error("Native request capture did not return a JSONL artifact path.");
    }
    return {
      captureResult,
      records: await this.#artifactReader.readArtifactRecords(jsonlPath),
      slot: request.slot,
    };
  }

  async #buildRequest(
    input: CaptureWorkbenchRunInput
  ): Promise<CaptureWorkbenchRequest> {
    const providerId = parseProviderId(input.selection.provider);
    const modelId = parseModelId(input.selection.model);
    const scenarioId = parseScenarioId(input.selection.step);
    const reasoning = readNonEmptyString(input.selection.reasoning);
    const baseRequest = {
      modelId,
      providerId,
      slot: {
        model: input.selection.model,
        provider: input.selection.provider,
        reasoning: input.selection.reasoning,
        step: input.selection.step,
      },
    };

    if (scenarioId === "diagnostic_probe") {
      return {
        ...baseRequest,
        options: { reasoning },
      };
    }
    if (scenarioId === "translation") {
      return {
        ...baseRequest,
        options: {
          reasoning,
          scenarioId,
          scenarioLabel: "Translation",
        },
      };
    }

    const workspaceSlug = readNonEmptyString(input.context.workspaceSlug);
    const workspacePath = readNonEmptyString(input.context.workspacePath);
    if (!(workspacePath && workspaceSlug)) {
      throw new Error("Select a workspace before running workflow capture.");
    }
    const scenario = await this.#buildScenarioPrompt({
      context: input.context,
      scenarioId: scenarioId as WorkflowCaptureScenarioId,
      workspacePath,
      workspaceSlug,
    });
    return {
      ...baseRequest,
      options: {
        reasoning,
        scenarioId: scenario.scenarioId,
        scenarioInputPath: scenario.inputPath,
        scenarioLabel: scenario.scenarioLabel,
        scenarioPrompt: scenario.prompt,
        scenarioTargetPath: scenario.targetRelativePath,
        workspacePath,
      },
    };
  }

  async #buildScenarioPrompt(params: {
    readonly context: CaptureWorkbenchRunnerContext;
    readonly scenarioId: WorkflowCaptureScenarioId;
    readonly workspacePath: string;
    readonly workspaceSlug: string;
  }): Promise<NativeRequestCaptureScenarioPrompt> {
    const scenarioPromptBuilder =
      this.#scenarioPromptBuilder ?? (await loadScenarioPromptBuilder());
    return scenarioPromptBuilder({
      bypassUpstreamGuard: true,
      getWorkflowState: this.#transport.getWorkflowState.bind(this.#transport),
      scenarioId: params.scenarioId,
      settingsPayload: this.#transport.getLastSettingsPayload(),
      workspaceName: params.context.workspaceName,
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async #waitForCaptureResult(
    request: CaptureWorkbenchRequest,
    send: () => void
  ): Promise<SettingsNativeRequestCaptureResultPayload> {
    return new Promise((resolve, reject) => {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let unsubscribe = (): void => undefined;
      const settle = (
        action: () => void,
        clearTimer: boolean = true
      ): void => {
        if (clearTimer && timeout) {
          clearTimeout(timeout);
        }
        unsubscribe();
        action();
      };

      unsubscribe = this.#transport.onCoreEvent((message) => {
        const result = readCaptureResult(message);
        if (!result || !matchesCaptureResult(request, result)) {
          return;
        }
        settle(() => resolve(result));
      });
      timeout = setTimeout(() => {
        settle(
          () => reject(new Error("Timed out waiting for native request capture result.")),
          false
        );
      }, this.#timeoutMs);
      try {
        send();
      } catch (error) {
        settle(() => reject(error));
      }
    });
  }
}

export const createCaptureWorkbenchRunner = (
  params: {
    readonly artifactReader: Pick<WorkbenchStateClientApi, "readArtifactRecords">;
    readonly transport: CaptureWorkbenchRunnerTransport;
  },
  options?: {
    readonly scenarioPromptBuilder?: CaptureWorkbenchScenarioPromptBuilder;
    readonly timeoutMs?: number;
  }
): CaptureWorkbenchRunnerApi =>
  new CaptureWorkbenchRunner(params.transport, params.artifactReader, options);

interface CaptureWorkbenchRequest {
  readonly modelId: SettingsNativeRequestCaptureModelId;
  readonly options: SettingsNativeRequestCaptureOptions;
  readonly providerId: SettingsNativeRequestCaptureProviderId;
  readonly slot: WorkbenchSlotKey;
}

const parseProviderId = (
  value: string
): SettingsNativeRequestCaptureProviderId => {
  if (
    value === "claude" ||
    value === "codex" ||
    value === "kimi" ||
    value === "glmOpenCode"
  ) {
    return value;
  }
  throw new Error(`Unsupported capture provider: ${value}`);
};

const parseModelId = (value: string): SettingsNativeRequestCaptureModelId => {
  const modelId = readNonEmptyString(value);
  if (!modelId) {
    throw new Error("Select a model before running capture.");
  }
  return modelId as SettingsNativeRequestCaptureModelId;
};

const parseScenarioId = (
  value: string
): SettingsNativeRequestCaptureScenarioId => {
  if (
    value === "description" ||
    value === "virtual_simulation" ||
    value === "diagram_modules" ||
    value === "translation" ||
    value === "diagnostic_probe"
  ) {
    return value;
  }
  throw new Error(`Unsupported capture step: ${value}`);
};

const readCaptureResult = (
  message: IncomingMessage
): SettingsNativeRequestCaptureResultPayload | null =>
  message.type === "settings:native-request-capture:result" &&
  isCaptureResultPayload(message.payload)
    ? message.payload
    : null;

const matchesCaptureResult = (
  request: CaptureWorkbenchRequest,
  result: SettingsNativeRequestCaptureResultPayload
): boolean =>
  result.providerId === request.providerId &&
  (result.modelId === undefined ||
    result.modelId === null ||
    result.modelId === request.modelId);

const describeCaptureFailure = (
  result: SettingsNativeRequestCaptureResultPayload
): string =>
  readNonEmptyString(result.error) ??
  readNonEmptyString(result.reason) ??
  "Native request capture failed.";

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isCaptureResultPayload = (
  value: unknown
): value is SettingsNativeRequestCaptureResultPayload =>
  isRecord(value) && typeof value.ok === "boolean" && parseProviderIdSafe(value.providerId);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseProviderIdSafe = (
  value: unknown
): value is SettingsNativeRequestCaptureProviderId =>
  value === "claude" ||
  value === "codex" ||
  value === "kimi" ||
  value === "glmOpenCode";

const loadScenarioPromptBuilder =
  async (): Promise<CaptureWorkbenchScenarioPromptBuilder> => {
    const module = await import("./native-request-capture-scenario-prompt");
    return module.buildNativeRequestCaptureScenarioPrompt as CaptureWorkbenchScenarioPromptBuilder;
  };
