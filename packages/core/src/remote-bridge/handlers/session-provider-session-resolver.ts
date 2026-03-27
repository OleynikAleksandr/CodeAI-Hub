import type { ProviderRegistry } from "../../provider-registry";

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

export const resolveProviderSessionId = async (options: {
  readonly adapter: ProviderAdapter;
  readonly providerId: string;
  readonly workspacePath: string;
  readonly requestedProviderSessionId: string | null;
}): Promise<ProviderSessionResolution> => {
  const { adapter, providerId, workspacePath, requestedProviderSessionId } =
    options;
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
      const providerSessionId = await adapter.resumeSession(
        trimmedSessionId,
        workspacePath
      );
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
    const providerSessionId = await adapter.createSession(workspacePath);
    return {
      providerSessionId,
      didResume: false,
      supportsImmediateBinding:
        providerId === "geminiCli" && providerSessionId.length > 0,
    };
  } catch (error) {
    return {
      error: `Failed to create ${providerId} session: ${toErrorMessage(error)}`,
    };
  }
};
