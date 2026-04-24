import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type { ProviderAdapter } from "../provider-registry/provider-module-loader.types";
import { NativeRequestCaptureCertificateStore } from "./native-request-capture-certificates";
import { NativeRequestCapturePreflight } from "./native-request-capture-preflight";
import { NativeRequestCaptureProxy } from "./native-request-capture-proxy";
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

const PROVIDER_RUNTIME_IDS: Readonly<
  Record<NativeRequestCaptureProviderId, string>
> = {
  claude: "claudeCodeCli",
  codex: "codexCli",
};

const PROVIDER_TARGET_RULES: Readonly<
  Record<
    NativeRequestCaptureProviderId,
    readonly NativeRequestCaptureTargetRule[]
  >
> = {
  claude: [{ host: "api.anthropic.com", pathIncludes: "/v1/messages" }],
  codex: [
    { host: "chatgpt.com", pathIncludes: "/backend-api/codex/responses" },
  ],
};

interface ProviderAdapterLookup {
  getAdapter(providerId: string): ProviderAdapter | undefined;
}

type ProxyFactory = (
  options: ConstructorParameters<typeof NativeRequestCaptureProxy>[0]
) => Pick<NativeRequestCaptureProxy, "start">;

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
  readonly timeoutMs?: number;
}

export interface NativeRequestCaptureCommand {
  readonly providerId: NativeRequestCaptureProviderId;
  readonly workspacePath: string;
}

export interface NativeRequestCaptureCommandResult {
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly ok: boolean;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly reason: NativeRequestCaptureFailureReason | null;
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
    this.#timeoutMs = options.timeoutMs;
  }

  async capture(
    command: NativeRequestCaptureCommand
  ): Promise<NativeRequestCaptureCommandResult> {
    const runtimeProviderId = PROVIDER_RUNTIME_IDS[command.providerId];
    const adapter = this.#providerRegistry.getAdapter(runtimeProviderId);
    if (!adapter?.captureNativeRequest) {
      return this.#failure(command.providerId, "provider_not_supported", null);
    }

    const preflight = await this.#preflight.checkOpenSsl();
    if (!preflight.ok) {
      return this.#failure(
        command.providerId,
        preflight.reason ?? "tls_credentials_unavailable",
        null
      );
    }

    const captureId = this.#captureIdFactory();
    const writer = await NativeRequestCaptureWriter.create({
      captureId,
      outputDir: this.#outputDir,
      providerId: command.providerId,
    });
    const eventWrites: Promise<void>[] = [];
    const targetRules = PROVIDER_TARGET_RULES[command.providerId];
    const firstTargetHost = targetRules[0]?.host;
    if (!firstTargetHost) {
      return this.#failure(command.providerId, "target_not_seen", writer);
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
        certificateBundle,
        command,
        handle,
        writer,
      });
      await Promise.all(eventWrites);
      if (captureResult.status === "captured") {
        return {
          providerId: command.providerId,
          ok: true,
          markdownPath: writer.artifacts.markdownPath,
          jsonlPath: writer.artifacts.jsonlPath,
          error: null,
          reason: null,
        };
      }
      if (!captureResult.completedByProxy) {
        await writer.complete(captureResult.status, captureResult.reason);
      }
      return this.#failure(command.providerId, captureResult.reason, writer);
    } finally {
      await handle.stop();
    }
  }

  async #runProviderAndProxy(params: {
    readonly adapter: ProviderAdapter;
    readonly captureId: string;
    readonly certificateBundle: Awaited<
      ReturnType<NativeRequestCaptureCertificateStore["prepareHostCredentials"]>
    >;
    readonly command: NativeRequestCaptureCommand;
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
        probePrompt: DIAGNOSTIC_PROBE_PROMPT,
        proxyUrl: params.handle.proxyUrl,
        workspacePath: params.command.workspacePath,
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

  #failure(
    providerId: NativeRequestCaptureProviderId,
    reason: NativeRequestCaptureFailureReason,
    writer: NativeRequestCaptureWriter | null
  ): NativeRequestCaptureCommandResult {
    return {
      providerId,
      ok: false,
      markdownPath: writer?.artifacts.markdownPath ?? null,
      jsonlPath: writer?.artifacts.jsonlPath ?? null,
      error: reason,
      reason,
    };
  }
}

export const isNativeRequestCaptureProviderId = (
  value: unknown
): value is NativeRequestCaptureProviderId =>
  value === "claude" || value === "codex";

export const createCapturedProxyResult = (
  request: NativeRequestCaptureRequest
): NativeRequestCaptureProxyResult => ({ status: "captured", request });
