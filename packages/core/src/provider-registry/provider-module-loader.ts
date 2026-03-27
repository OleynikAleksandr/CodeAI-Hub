import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { Logger } from "../telemetry/logger";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GeminiAdapterCtor,
} from "./provider-module-loader.types";

type GeminiAdapterResolution =
  | { readonly kind: "ctor"; readonly ctor: GeminiAdapterCtor }
  | { readonly kind: "loader"; readonly loader: () => Promise<unknown> };

const requireModule = createRequire(
  process.argv[1] ?? path.join(process.cwd(), "package.json")
);

const dynamicRequire = (specifier: string): unknown => requireModule(specifier);

const dynamicImportModule = <T>(specifier: string): Promise<T> =>
  Function("specifier", "return import(specifier);")(specifier) as Promise<T>;

const extractGeminiAdapterCtor = (
  candidate: unknown
): GeminiAdapterCtor | null => {
  if (typeof candidate === "function") {
    return candidate as GeminiAdapterCtor;
  }
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const direct = (candidate as { GeminiProviderAdapter?: unknown })
    .GeminiProviderAdapter;
  if (typeof direct === "function") {
    return direct as GeminiAdapterCtor;
  }
  const fallback = (candidate as { default?: unknown }).default;
  if (fallback && typeof fallback === "object") {
    const nested = (fallback as { GeminiProviderAdapter?: unknown })
      .GeminiProviderAdapter;
    if (typeof nested === "function") {
      return nested as GeminiAdapterCtor;
    }
  }
  return null;
};

const resolveGeminiAdapter = (
  loaded: unknown
): GeminiAdapterResolution | null => {
  const direct = extractGeminiAdapterCtor(loaded);
  if (direct) {
    return { kind: "ctor", ctor: direct };
  }

  if (!loaded || typeof loaded !== "object") {
    return null;
  }

  const loader = (loaded as { loadGeminiProviderAdapter?: unknown })
    .loadGeminiProviderAdapter;
  if (typeof loader === "function") {
    return {
      kind: "loader",
      loader: loader as () => Promise<unknown>,
    };
  }

  const fallback = (loaded as { default?: unknown }).default;
  if (fallback && typeof fallback === "object") {
    const nestedLoader = (fallback as { loadGeminiProviderAdapter?: unknown })
      .loadGeminiProviderAdapter;
    if (typeof nestedLoader === "function") {
      return {
        kind: "loader",
        loader: nestedLoader as () => Promise<unknown>,
      };
    }
  }

  return null;
};

const materializeAdapterResolution = async (
  resolution: GeminiAdapterResolution | null,
  logger: Logger
): Promise<GeminiAdapterCtor | null> => {
  if (!resolution) {
    return null;
  }
  if (resolution.kind === "ctor") {
    return resolution.ctor;
  }
  try {
    const loaded = await resolution.loader();
    const ctor = extractGeminiAdapterCtor(loaded);
    if (!ctor) {
      logger.warn("Gemini adapter loader returned unexpected payload");
    }
    return ctor;
  } catch (error) {
    logger.warn("Gemini adapter loader invocation failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const loadClaudeAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): ClaudeAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly ClaudeProviderAdapter?: ClaudeAdapterCtor;
      };
      if (loaded?.ClaudeProviderAdapter) {
        logger.info("Loaded Claude module from override path", {
          overridePath,
        });
        return loaded.ClaudeProviderAdapter;
      }
      logger.warn("Override path missing ClaudeProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load Claude module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/claude-module") as {
    readonly ClaudeProviderAdapter: ClaudeAdapterCtor;
  };
  return bundled.ClaudeProviderAdapter;
};

export const loadCodexAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): CodexAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly CodexProviderAdapter?: CodexAdapterCtor;
      };
      if (loaded?.CodexProviderAdapter) {
        logger.info("Loaded Codex module from override path", {
          overridePath,
        });
        return loaded.CodexProviderAdapter;
      }
      logger.warn("Override path missing CodexProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load Codex module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/codex-module") as {
    readonly CodexProviderAdapter: CodexAdapterCtor;
  };
  return bundled.CodexProviderAdapter;
};

export const loadGeminiAdapterCtor = async (
  overridePath: string | undefined,
  logger: Logger
): Promise<GeminiAdapterCtor | null> => {
  const importAndResolve = async (
    specifier: string
  ): Promise<GeminiAdapterCtor | null> => {
    try {
      const loaded = await dynamicImportModule<unknown>(specifier);
      const resolution = resolveGeminiAdapter(loaded);
      return await materializeAdapterResolution(resolution, logger);
    } catch (importError) {
      logger.warn("Dynamic import failed", {
        specifier,
        message:
          importError instanceof Error
            ? importError.message
            : String(importError),
      });
      return null;
    }
  };

  const requireAndResolve = async (
    specifier: string
  ): Promise<GeminiAdapterCtor | null> => {
    try {
      const loaded = dynamicRequire(specifier);
      const resolution = resolveGeminiAdapter(loaded);
      return await materializeAdapterResolution(resolution, logger);
    } catch (requireError) {
      logger.debug("Require fallback failed", {
        specifier,
        message:
          requireError instanceof Error
            ? requireError.message
            : String(requireError),
      });
      return null;
    }
  };

  const tryResolve = async (
    specifier: string,
    allowRequireFallback = false
  ): Promise<GeminiAdapterCtor | null> => {
    const imported = await importAndResolve(specifier);
    if (imported) {
      return imported;
    }
    if (!allowRequireFallback) {
      return null;
    }
    return await requireAndResolve(specifier);
  };

  if (overridePath) {
    const overrideEsmEntry = path.join(overridePath, "dist", "index.js");
    const overrideEsmUrl = pathToFileURL(overrideEsmEntry).href;
    const overrideCjsEntry = path.join(overridePath, "dist", "index.cjs");
    const adapter =
      (await tryResolve(overrideCjsEntry, true)) ??
      (await tryResolve(overrideEsmUrl)) ??
      (await tryResolve(overrideEsmEntry, true));
    if (adapter) {
      logger.info("Loaded Gemini module from override path", {
        overridePath,
      });
      return adapter;
    }

    logger.warn("Override path missing GeminiProviderAdapter export", {
      overridePath,
    });
  }

  const bundledAdapter = await tryResolve("@codeai-hub/gemini-module", true);

  if (!bundledAdapter) {
    logger.warn(
      "Gemini provider module is not available; Gemini provider will be inactive."
    );
    return null;
  }

  return bundledAdapter;
};
