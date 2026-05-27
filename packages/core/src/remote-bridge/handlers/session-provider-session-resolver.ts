import type { ProviderRegistry } from "../../provider-registry";
import { resolveProviderImmediateBindingCapability } from "../../provider-registry/provider-descriptor-factory";

type ProviderAdapter = NonNullable<ReturnType<ProviderRegistry["getAdapter"]>>;

export type ProviderSessionResolution =
  | {
      readonly providerSessionId: string;
      readonly didResume: boolean;
      readonly supportsImmediateBinding: boolean;
    }
  | { readonly error: string };

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const DEFAULT_PROVIDER_SESSION_STARTUP_TIMEOUT_MS = 45_000;

const closeLateProviderSession = async (options: {
  readonly adapter: ProviderAdapter;
  readonly providerSessionId: string;
}): Promise<void> => {
  try {
    await options.adapter.closeSession(options.providerSessionId);
  } catch {
    // Late cleanup is best-effort. The visible failure is the startup timeout.
  }
};

const withProviderSessionStartupTimeout = async (options: {
  readonly adapter: ProviderAdapter;
  readonly operation: "create" | "resume";
  readonly providerId: string;
  readonly sessionPromise: Promise<string>;
  readonly timeoutMs: number;
}): Promise<string> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let didTimeout = false;
  const timeoutPromise = new Promise<string>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(
        new Error(
          `Provider ${options.providerId} session ${options.operation} timed out after ${options.timeoutMs}ms.`
        )
      );
    }, options.timeoutMs);
  });

  options.sessionPromise.then(
    (providerSessionId) => {
      if (!didTimeout || providerSessionId.trim().length === 0) {
        return;
      }
      closeLateProviderSession({
        adapter: options.adapter,
        providerSessionId,
      });
    },
    () => undefined
  );

  try {
    return await Promise.race([options.sessionPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const resolveProviderSessionId = async (options: {
  readonly adapter: ProviderAdapter;
  readonly providerId: string;
  readonly startupTimeoutMs?: number;
  readonly workspacePath: string;
  readonly requestedProviderSessionId: string | null;
}): Promise<ProviderSessionResolution> => {
  const { adapter, providerId, workspacePath, requestedProviderSessionId } =
    options;
  const startupTimeoutMs =
    options.startupTimeoutMs ?? DEFAULT_PROVIDER_SESSION_STARTUP_TIMEOUT_MS;
  const shouldResume =
    typeof requestedProviderSessionId === "string" &&
    requestedProviderSessionId.trim().length > 0;

  if (shouldResume) {
    if (!adapter.resumeSession) {
      return {
        error: `Provider ${providerId} does not support resume`,
      };
    }

    const trimmedSessionId = requestedProviderSessionId.trim();
    try {
      const providerSessionId = await withProviderSessionStartupTimeout({
        adapter,
        operation: "resume",
        providerId,
        sessionPromise: adapter.resumeSession(trimmedSessionId, workspacePath),
        timeoutMs: startupTimeoutMs,
      });
      return {
        providerSessionId,
        didResume: true,
        supportsImmediateBinding: true,
      };
    } catch (error) {
      return {
        error: `Failed to resume ${providerId} session ${trimmedSessionId}: ${toErrorMessage(
          error
        )}`,
      };
    }
  }

  try {
    const providerSessionId = await withProviderSessionStartupTimeout({
      adapter,
      operation: "create",
      providerId,
      sessionPromise: adapter.createSession(workspacePath),
      timeoutMs: startupTimeoutMs,
    });
    return {
      providerSessionId,
      didResume: false,
      supportsImmediateBinding:
        resolveProviderImmediateBindingCapability(providerId) &&
        providerSessionId.length > 0,
    };
  } catch (error) {
    return {
      error: `Failed to create ${providerId} session: ${toErrorMessage(error)}`,
    };
  }
};
