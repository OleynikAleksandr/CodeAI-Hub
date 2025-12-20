#!/usr/bin/env tsx

/**
 * Utility to fetch available AI models from each provider
 * Saves results to doc/tmp/available-models.json
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type ProviderModels = {
  provider: string;
  source: "api" | "static";
  models: string[];
  error?: string;
};

type ModelsOutput = {
  timestamp: string;
  claude: ProviderModels;
  codex: ProviderModels;
  gemini: ProviderModels;
};

// Known model lists (fallback if API unavailable)
const KNOWN_MODELS = {
  claude: [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  codex: [
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
    "code-davinci-002",
    "code-cushman-001",
  ],
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-pro-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ],
};

/**
 * Fetch Claude models from Anthropic API
 */
async function fetchClaudeModels(): Promise<ProviderModels> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn(
      "[Claude] No ANTHROPIC_API_KEY found, using static model list"
    );
    return {
      provider: "Anthropic Claude",
      source: "static",
      models: KNOWN_MODELS.claude,
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    const models = data.data?.map((m) => m.id) ?? KNOWN_MODELS.claude;

    return {
      provider: "Anthropic Claude",
      source: "api",
      models,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Claude] API fetch failed: ${errorMsg}`);
    return {
      provider: "Anthropic Claude",
      source: "static",
      models: KNOWN_MODELS.claude,
      error: errorMsg,
    };
  }
}

/**
 * Fetch Codex/OpenAI models
 */
async function fetchCodexModels(): Promise<ProviderModels> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  if (!apiKey) {
    console.warn("[Codex] No OPENAI_API_KEY found, using static model list");
    return {
      provider: "OpenAI Codex",
      source: "static",
      models: KNOWN_MODELS.codex,
    };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };
    const models =
      data.data
        ?.map((m) => m.id)
        .filter((id) => id.includes("gpt") || id.includes("code")) ??
      KNOWN_MODELS.codex;

    return {
      provider: "OpenAI Codex",
      source: "api",
      models,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Codex] API fetch failed: ${errorMsg}`);
    return {
      provider: "OpenAI Codex",
      source: "static",
      models: KNOWN_MODELS.codex,
      error: errorMsg,
    };
  }
}

/**
 * Fetch Gemini models
 * Note: Google AI API doesn't have a public models endpoint,
 * so we use the known model list
 */
async function fetchGeminiModels(): Promise<ProviderModels> {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("[Gemini] No GOOGLE_API_KEY found, using static model list");
    return {
      provider: "Google Gemini",
      source: "static",
      models: KNOWN_MODELS.gemini,
    };
  }

  try {
    // Try to fetch from Google AI API (if endpoint exists)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      models?: Array<{ name: string }>;
    };
    const models =
      data.models
        ?.map((m) => m.name.replace("models/", ""))
        .filter((name) => name.startsWith("gemini")) ?? KNOWN_MODELS.gemini;

    return {
      provider: "Google Gemini",
      source: "api",
      models,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[Gemini] API fetch failed, using static list: ${errorMsg}`);
    return {
      provider: "Google Gemini",
      source: "static",
      models: KNOWN_MODELS.gemini,
      error: errorMsg,
    };
  }
}

async function main(): Promise<void> {
  console.log("Fetching available AI models from providers...\n");

  const [claude, codex, gemini] = await Promise.all([
    fetchClaudeModels(),
    fetchCodexModels(),
    fetchGeminiModels(),
  ]);

  const output: ModelsOutput = {
    timestamp: new Date().toISOString(),
    claude,
    codex,
    gemini,
  };

  // Ensure output directory exists
  const outputDir = join(process.cwd(), "doc", "tmp");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, "available-models.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log("\n✅ Model list saved to:", outputPath);
  console.log("\nSummary:");
  console.log(`  Claude: ${claude.models.length} models (${claude.source})`);
  console.log(`  Codex:  ${codex.models.length} models (${codex.source})`);
  console.log(`  Gemini: ${gemini.models.length} models (${gemini.source})\n`);
}

main().catch((error: Error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
