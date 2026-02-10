import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type { ModelInfo } from "../../../../types/session";
import type { Settings } from "../components/settings/settings-state-model";

type ProviderKey = "claude" | "codex" | "gemini";

const PROVIDER_ID_TO_KEY: Record<ProviderStackId, ProviderKey> = {
  claudeCodeCli: "claude",
  codexCli: "codex",
  geminiCli: "gemini",
};

// Regex patterns at top level for performance
const SINGLE_DIGIT_REGEX = /^\d+$/;
const DECIMAL_VERSION_REGEX = /^\d+\.\d+$/;
const VERSION_JOIN_REGEX = /(\d+)\s+(\d+)/g;

const formatModelDisplayName = (modelId: string): string => {
  // Convert model IDs like "claude-opus-4-5" to "Claude Opus 4.5"
  // or "gpt-5.2-codex" to "GPT 5.2 Codex"
  return modelId
    .split("-")
    .map((part, index) => {
      // Check if part is a version number like "4" or "5"
      if (SINGLE_DIGIT_REGEX.test(part)) {
        return part;
      }
      // Check if part is a version with decimal like "5.2"
      if (DECIMAL_VERSION_REGEX.test(part)) {
        return part;
      }
      // Capitalize first letter
      return index === 0 || part.length > 2
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part.toUpperCase();
    })
    .join(" ")
    .replace(VERSION_JOIN_REGEX, "$1.$2"); // Join version numbers like "4 5" -> "4.5"
};

/**
 * Build ModelInfo array from session provider IDs and settings.
 */
export const buildModelInfoList = (
  providerIds: readonly ProviderStackId[],
  settings: Settings | null
): readonly ModelInfo[] => {
  if (!settings) {
    // Return basic info without model details
    return providerIds.map((providerId) => ({
      providerId,
      providerName: getDefaultProviderTitle(providerId),
      modelId: "unknown",
      modelDisplayName: getDefaultProviderTitle(providerId),
    }));
  }

  return providerIds.map((providerId) => {
    const providerKey = PROVIDER_ID_TO_KEY[providerId];
    const providerName = getDefaultProviderTitle(providerId);
    const providerSettings = settings.providers[providerKey];

    const modelId = providerSettings.defaultModel;
    const modelDisplayName = formatModelDisplayName(modelId);

    // Get reasoning level for Codex or Gemini
    let reasoning: string | undefined;
    if (providerKey === "claude") {
      const claudeSettings = settings.providers.claude;
      reasoning = claudeSettings.thinking.enabled
        ? "thinking on"
        : "thinking off";
    } else if (providerKey === "codex") {
      const codexSettings = settings.providers.codex;
      reasoning = codexSettings.reasoningByModel[modelId];
    } else if (providerKey === "gemini") {
      const geminiSettings = settings.providers.gemini;
      reasoning = geminiSettings.thinkingLevelByModel[modelId];
    }

    return {
      providerId,
      providerName,
      modelId,
      modelDisplayName,
      reasoning,
    };
  });
};
