import type { GeminiCliBridgeMetadata, ModuleReporter } from "../types";
import {
  loadGeminiModules,
  validateGeminiCliCoreDependencyGraph,
} from "./cli-bridge-module-loader";
import {
  resolveGeminiCliCoreRoot,
  resolveGeminiCliRoot,
} from "./cli-bridge-root-resolver";
import type { GeminiCliBridge } from "./cli-types";

const GEMINI_CLI_PACKAGE = "@google/gemini-cli";
const GEMINI_CLI_CORE_PACKAGE = "@google/gemini-cli-core";
const GEMINI_CLI_COMPATIBILITY_ERROR_CODE = "GEMINI_CLI_COMPATIBILITY_ERROR";

type ErrorWithCode = Error & { code?: string; cause?: unknown };

const createGeminiCliCompatibilityError = (
  error: unknown,
  options: { readonly cliRoot: string; readonly cliCoreRoot: string }
): ErrorWithCode => {
  const baseMessage =
    error instanceof Error ? error.message : `Unknown error: ${String(error)}`;
  const wrapped = new Error(
    `Gemini CLI runtime compatibility failure. The installed @google/gemini-cli-core package layout does not match the expected runtime modules. cliRoot=${options.cliRoot}, cliCoreRoot=${options.cliCoreRoot}. Root error: ${baseMessage}`
  ) as ErrorWithCode;
  wrapped.name = "GeminiCliCompatibilityError";
  wrapped.code = GEMINI_CLI_COMPATIBILITY_ERROR_CODE;
  wrapped.cause = error;
  return wrapped;
};

export const isGeminiCliCompatibilityError = (error: unknown): boolean =>
  error instanceof Error &&
  (error as { code?: string }).code === GEMINI_CLI_COMPATIBILITY_ERROR_CODE;

export interface LoadCliBridgeOptions {
  readonly expectedCliVersion?: string;
  readonly expectedCoreVersion?: string;
  readonly reporter?: ModuleReporter;
}

export const loadCliBridgeFromGlobal = async (
  options: LoadCliBridgeOptions = {}
): Promise<GeminiCliBridge> => {
  const { root: cliRoot, version: resolvedCliVersion } =
    await resolveGeminiCliRoot().catch((error: unknown) => {
      options.reporter?.error?.(
        "Gemini CLI is not installed or could not be located",
        error instanceof Error ? error : String(error)
      );
      throw error;
    });

  const { root: cliCoreRoot, version: resolvedCoreVersion } =
    await resolveGeminiCliCoreRoot(cliRoot).catch((error: unknown) => {
      options.reporter?.error?.(
        "Gemini CLI Core is not installed or could not be located",
        error instanceof Error ? error : String(error)
      );
      throw error;
    });

  if (
    options.expectedCliVersion &&
    options.expectedCliVersion !== resolvedCliVersion
  ) {
    options.reporter?.warn?.("Gemini CLI version mismatch detected", {
      expected: options.expectedCliVersion,
      found: resolvedCliVersion,
      location: cliRoot,
    });
  }

  if (
    options.expectedCoreVersion &&
    options.expectedCoreVersion !== resolvedCoreVersion
  ) {
    options.reporter?.warn?.("Gemini CLI Core version mismatch detected", {
      expected: options.expectedCoreVersion,
      found: resolvedCoreVersion,
      location: cliCoreRoot,
    });
  }

  const modules = await loadGeminiModules(cliRoot, cliCoreRoot).catch(
    (error: unknown) => {
      const compatibilityError = createGeminiCliCompatibilityError(error, {
        cliRoot,
        cliCoreRoot,
      });
      options.reporter?.error?.(
        "Gemini CLI runtime module compatibility check failed",
        compatibilityError
      );
      throw compatibilityError;
    }
  );
  try {
    validateGeminiCliCoreDependencyGraph(cliCoreRoot, "Gemini CLI Core");
  } catch (error) {
    const compatibilityError = createGeminiCliCompatibilityError(error, {
      cliRoot,
      cliCoreRoot,
    });
    options.reporter?.error?.(
      "Gemini CLI runtime dependency check failed",
      compatibilityError
    );
    throw compatibilityError;
  }

  const metadata: GeminiCliBridgeMetadata = {
    version: resolvedCliVersion,
    preparedAt: new Date().toISOString(),
    source: "global",
    cli: {
      package: GEMINI_CLI_PACKAGE,
      requiredVersion: options.expectedCliVersion,
      resolvedVersion: resolvedCliVersion,
      location: cliRoot,
    },
    cliCore: {
      package: GEMINI_CLI_CORE_PACKAGE,
      version: resolvedCoreVersion,
    },
  };

  return {
    modules,
    metadata,
  };
};
