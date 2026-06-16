import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type {
  ProviderAdapter,
  ProviderNativeRequestCaptureAppliedTurnConfig,
  ProviderNativeRequestCaptureInvocationPurpose,
} from "../provider-registry/provider-module-loader.types";
import { NativeRequestCaptureCertificateStore } from "./native-request-capture-certificates";
import { NativeRequestCapturePreflight } from "./native-request-capture-preflight";
import { NativeRequestCaptureProxy } from "./native-request-capture-proxy";
import { applyNativeRequestCaptureReasoningOverride } from "./native-request-capture-reasoning-override";
import type {
  NativeRequestCaptureFailureReason,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureProxyHandle,
  NativeRequestCaptureProxyResult,
  NativeRequestCaptureRequest,
  NativeRequestCaptureTargetRule,
} from "./native-request-capture-types";
import { NativeRequestCaptureWriter } from "./native-request-capture-writer";

const DEFAULT_OUTPUT_DIR = path.join(
  os.homedir(),
  ".codeai-hub",
  "logs",
  "native-request-capture"
);
const DIAGNOSTIC_PROBE_PROMPT =
  "CodeAI Hub native request capture probe. This request must not be sent upstream.";
const TRANSLATION_SCENARIO_ID = "translation";

const PROVIDER_RUNTIME_IDS: Readonly<
  Record<NativeRequestCaptureProviderId, string>
> = {
  claude: "claudeCodeCli",
  codex: "codexCli",
  kimi: "kimiCode",
  glmClaudeCode: "glmClaudeCode",
  glmOpenCode: "glmOpenCode",
};

const PROVIDER_TARGET_RULES: Readonly<
  Record<
    NativeRequestCaptureProviderId,
    readonly NativeRequestCaptureTargetRule[]
  >
> = {
  claude: [
    {
      host: "api.anthropic.com",
      minimumToolCount: 1,
      pathIncludes: "/v1/messages",
    },
  ],
  codex: [
    { host: "chatgpt.com", pathIncludes: "/backend-api/codex/responses" },
  ],
  kimi: [],
  glmClaudeCode: [{ host: "api.z.ai", pathIncludes: "/api/anthropic" }],
  glmOpenCode: [{ host: "api.z.ai", pathIncludes: "/api/coding/paas/v4" }],
};

interface ProviderAdapterLookup {
  getAdapter(providerId: string): ProviderAdapter | undefined;
  getDescriptor?(providerId: string): unknown;
}

type ProxyFactory = (
  options: ConstructorParameters<typeof NativeRequestCaptureProxy>[0]
) => Pick<NativeRequestCaptureProxy, "start">;
type AppliedTurnConfigResolver = (options: {
  readonly invocationPurpose: ProviderNativeRequestCaptureInvocationPurpose;
  readonly providerId: string;
  readonly scenarioId?: string | null;
  readonly targetModelId?: string | null;
}) => ProviderNativeRequestCaptureAppliedTurnConfig | null;

interface CertificateStoreLike {
  prepareHostCredentials(
    hostname: string
  ): Promise<
    Awaited<
      ReturnType<NativeRequestCaptureCertificateStore["prepareHostCredentials"]>
    >
  >;
}

interface PreflightLike {
  checkOpenSsl(): Promise<{
    readonly ok: boolean;
    readonly reason: NativeRequestCaptureFailureReason | null;
  }>;
}

interface NativeRequestCaptureFacadeOptions {
  readonly captureIdFactory?: () => string;
  readonly certificateStore?: CertificateStoreLike;
  readonly outputDir?: string;
  readonly preflight?: PreflightLike;
  readonly providerRegistry: ProviderAdapterLookup;
  readonly proxyFactory?: ProxyFactory;
  readonly resolveAppliedTurnConfig?: AppliedTurnConfigResolver;
  readonly timeoutMs?: number;
}

export interface NativeRequestCaptureCommand {
  readonly modelId?: string | null;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly reasoning?: string | null;
  readonly scenarioId?: string | null;
  readonly scenarioInputPath?: string | null;
  readonly scenarioLabel?: string | null;
  readonly scenarioPrompt?: string | null;
  readonly scenarioTargetPath?: string | null;
  readonly workspacePath: string;
}

export interface NativeRequestCaptureCommandResult {
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly modelId: string | null;
  readonly ok: boolean;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly reason: NativeRequestCaptureFailureReason | null;
  readonly scenarioId: string | null;
}

type NativeRequestCaptureRunResult = NativeRequestCaptureProxyResult & {
  readonly completedByProxy: boolean;
};

export class NativeRequestCaptureFacade {
  readonly #captureIdFactory: () => string;
  readonly #certificateStore: CertificateStoreLike;
  readonly #outputDir: string;
  readonly #preflight: PreflightLike;
  readonly #providerRegistry: ProviderAdapterLookup;
  readonly #proxyFactory: ProxyFactory;
  readonly #resolveAppliedTurnConfig?: AppliedTurnConfigResolver;
  readonly #timeoutMs?: number;

  constructor(options: NativeRequestCaptureFacadeOptions) {
    this.#captureIdFactory = options.captureIdFactory ?? randomUUID;
    this.#certificateStore =
      options.certificateStore ?? new NativeRequestCaptureCertificateStore();
    this.#outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
    this.#preflight = options.preflight ?? new NativeRequestCapturePreflight();
    this.#providerRegistry = options.providerRegistry;
    this.#proxyFactory =
      options.proxyFactory ??
      ((proxyOptions) => new NativeRequestCaptureProxy(proxyOptions));
    this.#resolveAppliedTurnConfig = options.resolveAppliedTurnConfig;
    this.#timeoutMs = options.timeoutMs;
  }

  async capture(
    command: NativeRequestCaptureCommand
  ): Promise<NativeRequestCaptureCommandResult> {
    const runtimeProviderId = PROVIDER_RUNTIME_IDS[command.providerId];
    const adapter = this.#providerRegistry.getAdapter(runtimeProviderId);
    if (!adapter) {
      const knownProvider =
        this.#providerRegistry.getDescriptor?.(runtimeProviderId) !== undefined;
      return this.#failure(
        command,
        knownProvider ? "provider_not_ready" : "provider_not_supported",
        null
      );
    }
    if (!adapter.captureNativeRequest) {
      return this.#failure(command, "provider_not_supported", null);
    }

    if (command.providerId !== "kimi") {
      const preflight = await this.#preflight.checkOpenSsl();
      if (!preflight.ok) {
        return this.#failure(
          command,
          preflight.reason ?? "tls_credentials_unavailable",
          null
        );
      }
    }

    const captureId = this.#captureIdFactory();
    const invocationPurpose = resolveInvocationPurpose(command.scenarioId);
    const resolvedAppliedTurnConfig =
      this.#resolveAppliedTurnConfig?.({
        invocationPurpose,
        providerId: runtimeProviderId,
        scenarioId: command.scenarioId ?? null,
        targetModelId: command.modelId ?? null,
      }) ?? null;
    const appliedTurnConfig = applyNativeRequestCaptureReasoningOverride({
      appliedTurnConfig: resolvedAppliedTurnConfig,
      providerId: runtimeProviderId,
      reasoning: command.reasoning,
    });
    const writer = await NativeRequestCaptureWriter.create({
      appliedTurnConfig,
      captureId,
      mode: "managed",
      outputDir: this.#outputDir,
      providerId: command.providerId,
      scenarioMetadata: buildScenarioMetadata(command, invocationPurpose),
      selectedModelId: command.modelId ?? null,
    });
    const eventWrites: Promise<void>[] = [];
    const targetRules = PROVIDER_TARGET_RULES[command.providerId];
    if (command.providerId === "kimi") {
      return this.#captureWireOnly({
        adapter,
        appliedTurnConfig,
        captureId,
        command,
        eventWrites,
        writer,
      });
    }
    const firstTargetHost = targetRules[0]?.host;
    if (!firstTargetHost) {
      return this.#failure(command, "target_not_seen", writer);
    }

    const certificateBundle =
      await this.#certificateStore.prepareHostCredentials(firstTargetHost);
    const proxy = this.#proxyFactory({
      captureId,
      providerId: command.providerId,
      targetRules,
      timeoutMs: this.#timeoutMs,
      onEvent: (event) => {
        eventWrites.push(writer.recordProxyEvent(event));
      },
      resolveTlsCredentials: async ({ hostname }) =>
        (await this.#certificateStore.prepareHostCredentials(hostname))
          .credentials,
    });
    const handle = await proxy.start();

    try {
      const captureResult = await this.#runProviderAndProxy({
        captureId,
        adapter,
        appliedTurnConfig,
        certificateBundle,
        command,
        eventWrites,
        handle,
        writer,
      });
      await Promise.all(eventWrites);
      if (captureResult.status === "captured") {
        return this.#success(command, writer);
      }
      if (!captureResult.completedByProxy) {
        await writer.complete(captureResult.status, captureResult.reason);
      }
      return this.#failure(command, captureResult.reason, writer);
    } finally {
      await handle.stop();
    }
  }

  async #runProviderAndProxy(params: {
    readonly adapter: ProviderAdapter;
    readonly appliedTurnConfig: ProviderNativeRequestCaptureAppliedTurnConfig | null;
    readonly captureId: string;
    readonly certificateBundle: Awaited<
      ReturnType<NativeRequestCaptureCertificateStore["prepareHostCredentials"]>
    >;
    readonly command: NativeRequestCaptureCommand;
    readonly eventWrites: Promise<void>[];
    readonly handle: NativeRequestCaptureProxyHandle;
    readonly writer: NativeRequestCaptureWriter;
  }): Promise<NativeRequestCaptureRunResult> {
    const captureNativeRequest = params.adapter.captureNativeRequest;
    if (!captureNativeRequest) {
      return {
        completedByProxy: false,
        status: "failed",
        reason: "provider_not_supported",
      };
    }

    const providerRun = captureNativeRequest
      .call(params.adapter, {
        captureId: params.captureId,
        certificateEnv: params.certificateBundle.envHints,
        certificatePath: params.certificateBundle.certificatePath,
        appliedTurnConfig: params.appliedTurnConfig,
        invocationPurpose: resolveInvocationPurpose(params.command.scenarioId),
        probePrompt: DIAGNOSTIC_PROBE_PROMPT,
        proxyUrl: params.handle.proxyUrl,
        recordDiagnosticContext: (record) => {
          params.eventWrites.push(
            params.writer.recordProviderDiagnosticContext(record)
          );
        },
        recordAppliedInputEnvelope: (envelope) => {
          params.eventWrites.push(
            params.writer.recordAppliedInputEnvelope(envelope)
          );
        },
        selectedModelId: params.command.modelId ?? null,
        scenarioId: params.command.scenarioId ?? null,
        workspacePath: params.command.workspacePath,
        workflowPrompt:
          resolveInvocationPurpose(params.command.scenarioId) === "translation"
            ? null
            : (params.command.scenarioPrompt ?? null),
      })
      .then(() => ({ type: "provider_done" as const }))
      .catch((error: unknown) => ({ type: "provider_failed" as const, error }));
    const proxyRun = params.handle
      .waitForCapture()
      .then((result) => ({ type: "proxy_done" as const, result }));
    const first = await Promise.race([providerRun, proxyRun]);
    if (first.type === "proxy_done") {
      return { ...first.result, completedByProxy: true };
    }
    if (first.type === "provider_failed") {
      await params.writer.recordProviderRuntimeError(first.error);
      return {
        completedByProxy: false,
        status: "failed",
        reason: "runtime_failed",
      };
    }
    return {
      completedByProxy: false,
      status: "failed",
      reason: "target_not_seen",
    };
  }

  async #captureWireOnly(params: {
    readonly adapter: ProviderAdapter;
    readonly appliedTurnConfig: ProviderNativeRequestCaptureAppliedTurnConfig | null;
    readonly captureId: string;
    readonly command: NativeRequestCaptureCommand;
    readonly eventWrites: Promise<void>[];
    readonly writer: NativeRequestCaptureWriter;
  }): Promise<NativeRequestCaptureCommandResult> {
    const captureNativeRequest = params.adapter.captureNativeRequest;
    if (!captureNativeRequest) {
      return this.#failure(
        params.command,
        "provider_not_supported",
        params.writer
      );
    }
    try {
      await captureNativeRequest.call(params.adapter, {
        captureId: params.captureId,
        certificateEnv: {},
        certificatePath: "",
        appliedTurnConfig: params.appliedTurnConfig,
        invocationPurpose: resolveInvocationPurpose(params.command.scenarioId),
        probePrompt: DIAGNOSTIC_PROBE_PROMPT,
        proxyUrl: "wire://kimi",
        recordDiagnosticContext: (record) => {
          params.eventWrites.push(
            params.writer.recordProviderDiagnosticContext(record)
          );
        },
        recordAppliedInputEnvelope: (envelope) => {
          params.eventWrites.push(
            params.writer.recordAppliedInputEnvelope(envelope)
          );
        },
        selectedModelId: params.command.modelId ?? null,
        scenarioId: params.command.scenarioId ?? null,
        workspacePath: params.command.workspacePath,
        workflowPrompt:
          resolveInvocationPurpose(params.command.scenarioId) === "translation"
            ? null
            : (params.command.scenarioPrompt ?? null),
      });
      await Promise.all(params.eventWrites);
      await params.writer.complete("captured", null);
      return this.#success(params.command, params.writer);
    } catch (error: unknown) {
      await params.writer.recordProviderRuntimeError(error);
      await params.writer.complete("failed", "runtime_failed");
      return this.#failure(params.command, "runtime_failed", params.writer);
    }
  }

  #failure(
    command: Pick<
      NativeRequestCaptureCommand,
      "modelId" | "providerId" | "scenarioId"
    >,
    reason: NativeRequestCaptureFailureReason,
    writer: NativeRequestCaptureWriter | null
  ): NativeRequestCaptureCommandResult {
    return {
      providerId: command.providerId,
      ok: false,
      markdownPath: writer?.artifacts.markdownPath ?? null,
      modelId: command.modelId ?? null,
      jsonlPath: writer?.artifacts.jsonlPath ?? null,
      error: reason,
      reason,
      scenarioId: command.scenarioId ?? null,
    };
  }

  #success(
    command: Pick<
      NativeRequestCaptureCommand,
      "modelId" | "providerId" | "scenarioId"
    >,
    writer: NativeRequestCaptureWriter
  ): NativeRequestCaptureCommandResult {
    return {
      providerId: command.providerId,
      ok: true,
      markdownPath: writer.artifacts.markdownPath,
      modelId: command.modelId ?? null,
      jsonlPath: writer.artifacts.jsonlPath,
      error: null,
      reason: null,
      scenarioId: command.scenarioId ?? null,
    };
  }
}

export const isNativeRequestCaptureProviderId = (
  value: unknown
): value is NativeRequestCaptureProviderId =>
  value === "claude" ||
  value === "codex" ||
  value === "kimi" ||
  value === "glmClaudeCode" ||
  value === "glmOpenCode";

export const createCapturedProxyResult = (
  request: NativeRequestCaptureRequest
): NativeRequestCaptureProxyResult => ({ status: "captured", request });

const buildScenarioMetadata = (
  command: NativeRequestCaptureCommand,
  invocationPurpose: ProviderNativeRequestCaptureInvocationPurpose
): Record<string, unknown> | null => {
  if (!command.scenarioId) {
    return null;
  }
  return {
    id: command.scenarioId,
    inputPath: command.scenarioInputPath ?? null,
    label: command.scenarioLabel ?? command.scenarioId,
    purpose: invocationPurpose,
    promptLength:
      invocationPurpose === "translation"
        ? 0
        : (command.scenarioPrompt?.length ?? 0),
    targetPath: command.scenarioTargetPath ?? null,
  };
};

const resolveInvocationPurpose = (
  scenarioId?: string | null
): ProviderNativeRequestCaptureInvocationPurpose =>
  scenarioId === TRANSLATION_SCENARIO_ID ? "translation" : "workflow-agent";
