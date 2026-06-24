import { createRequire } from "node:module";
import path from "node:path";
import type { CodexProviderAdapter as BundledCodexProviderAdapter } from "@codeai-hub/codex-app-server-module";
import type { GlmProviderAdapter as BundledGlmProviderAdapter } from "@codeai-hub/glm-module";
import type { GlmOpenCodeProviderAdapter as BundledGlmOpenCodeProviderAdapter } from "@codeai-hub/glm-opencode-module";
import type { Logger } from "../telemetry/logger";
import type {
  ClaudeAdapterCtor,
  CodexAdapterCtor,
  GlmAdapterCtor,
  GlmOpenCodeAdapterCtor,
} from "./provider-module-loader.types";

const requireModule = createRequire(
  process.argv[1] ?? path.join(process.cwd(), "package.json")
);

const dynamicRequire = (specifier: string): unknown => requireModule(specifier);

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
  const bundled = dynamicRequire("@codeai-hub/codex-app-server-module") as {
    readonly CodexProviderAdapter: typeof BundledCodexProviderAdapter;
  };
  return bundled.CodexProviderAdapter as CodexAdapterCtor;
};

export const loadGlmOpenCodeAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): GlmOpenCodeAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly GlmOpenCodeProviderAdapter?: GlmOpenCodeAdapterCtor;
      };
      if (loaded?.GlmOpenCodeProviderAdapter) {
        logger.info("Loaded GLM-OpenCode module from override path", {
          overridePath,
        });
        return loaded.GlmOpenCodeProviderAdapter;
      }
      logger.warn("Override path missing GlmOpenCodeProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error(
        "Failed to load GLM-OpenCode module override",
        error as Error,
        {
          overridePath,
        }
      );
    }
  }
  const bundled = dynamicRequire("@codeai-hub/glm-opencode-module") as {
    readonly GlmOpenCodeProviderAdapter: typeof BundledGlmOpenCodeProviderAdapter;
  };
  return bundled.GlmOpenCodeProviderAdapter as GlmOpenCodeAdapterCtor;
};

export const loadGlmAdapterCtor = (
  overridePath: string | undefined,
  logger: Logger
): GlmAdapterCtor => {
  if (overridePath) {
    try {
      const overrideEntry = path.join(overridePath, "dist", "index.js");
      const loaded = dynamicRequire(overrideEntry) as {
        readonly GlmProviderAdapter?: GlmAdapterCtor;
      };
      if (loaded?.GlmProviderAdapter) {
        logger.info("Loaded GLM module from override path", { overridePath });
        return loaded.GlmProviderAdapter;
      }
      logger.warn("Override path missing GlmProviderAdapter export", {
        overridePath,
      });
    } catch (error) {
      logger.error("Failed to load GLM module override", error as Error, {
        overridePath,
      });
    }
  }
  const bundled = dynamicRequire("@codeai-hub/glm-module") as {
    readonly GlmProviderAdapter: typeof BundledGlmProviderAdapter;
  };
  return bundled.GlmProviderAdapter as GlmAdapterCtor;
};
