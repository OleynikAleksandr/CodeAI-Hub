export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high" | "off";

export type GeminiModelId =
  | "gemini-3-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-2.5-pro"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite";

export type GeminiModelDescriptor = {
  readonly id: GeminiModelId;
  readonly displayName: string;
  readonly description: string;
  readonly status: "preview" | "generally_available";
  readonly family: "gemini-3" | "gemini-2.5";
  readonly supportedThinkingLevels: readonly GeminiThinkingLevel[];
};

export const GEMINI_RECOMMENDED_MODELS: readonly GeminiModelDescriptor[] = [
  {
    id: "gemini-3-pro-preview",
    displayName: "Gemini 3 Pro Preview",
    description: "Most advanced reasoning Gemini model for complex problems.",
    status: "preview",
    family: "gemini-3",
    supportedThinkingLevels: ["off", "low", "high"],
  },
  {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    description: "Pro-grade reasoning with Flash-level latency and cost.",
    status: "preview",
    family: "gemini-3",
    supportedThinkingLevels: ["off", "minimal", "low", "medium", "high"],
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Deep reasoning model with Think mode for complex use cases.",
    status: "generally_available",
    family: "gemini-2.5",
    supportedThinkingLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "High-throughput model for enterprise tasks.",
    status: "generally_available",
    family: "gemini-2.5",
    supportedThinkingLevels: ["off", "low", "medium", "high"],
  },
  {
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    description: "Most cost-efficient and fastest 2.5 model.",
    status: "generally_available",
    family: "gemini-2.5",
    supportedThinkingLevels: ["off", "low", "medium", "high"],
  },
] as const;

export const GEMINI_MODEL_ID_SET = new Set<GeminiModelId>(
  GEMINI_RECOMMENDED_MODELS.map((model) => model.id)
);

export const DEFAULT_GEMINI_MODEL_ID: GeminiModelId = "gemini-3-pro-preview";

export const DEFAULT_GEMINI_THINKING_LEVEL: GeminiThinkingLevel = "low";

export type GeminiThinkingLevelDescriptor = {
  readonly name: GeminiThinkingLevel;
  readonly description: string;
  readonly useCase: string;
};

export const GEMINI_THINKING_LEVELS: readonly GeminiThinkingLevelDescriptor[] =
  [
    {
      name: "off",
      description: "Thinking is disabled. Standard response mode.",
      useCase: "Basic tasks without complex reasoning.",
    },
    {
      name: "minimal",
      description: "Fastest, minimal reasoning overhead.",
      useCase: "Straightforward answers, low latency.",
    },
    {
      name: "low",
      description: "Faster responses with lighter reasoning.",
      useCase: "Quick coding tasks, simple queries.",
    },
    {
      name: "medium",
      description: "Balanced reasoning and speed.",
      useCase: "General development and problem solving.",
    },
    {
      name: "high",
      description: "Maximum reasoning depth for complex problems.",
      useCase: "Complex refactoring, architecture, and PhD-level tasks.",
    },
  ] as const;
