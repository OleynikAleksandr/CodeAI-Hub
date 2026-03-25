export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high" | "off";

export type GeminiModelId = "gemini-3.1-pro-preview" | "gemini-3-flash-preview";

export type GeminiModelDescriptor = {
  readonly id: GeminiModelId;
  readonly displayName: string;
  readonly description: string;
  readonly status: "preview" | "generally_available";
  readonly family: "gemini-3";
  readonly supportedThinkingLevels: readonly GeminiThinkingLevel[];
};

export const GEMINI_RECOMMENDED_MODELS: readonly GeminiModelDescriptor[] = [
  {
    id: "gemini-3.1-pro-preview",
    displayName: "Gemini 3.1 Pro",
    description: "Most advanced reasoning Gemini model (1M context).",
    status: "preview",
    family: "gemini-3",
    supportedThinkingLevels: ["low", "high"],
  },
  {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash",
    description: "Pro-grade reasoning with Flash-level latency and cost.",
    status: "preview",
    family: "gemini-3",
    supportedThinkingLevels: ["minimal", "low", "medium", "high"],
  },
] as const;

export const GEMINI_MODEL_ID_SET = new Set<GeminiModelId>(
  GEMINI_RECOMMENDED_MODELS.map((model) => model.id)
);

export const DEFAULT_GEMINI_MODEL_ID: GeminiModelId = "gemini-3.1-pro-preview";

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
      description: "Disable model's internal thinking process.",
      useCase: "Basic tasks, fastest response.",
    },
    {
      name: "minimal",
      description: "Absolute minimum reasoning tokens.",
      useCase: "Low-complexity tasks, very low latency.",
    },
    {
      name: "low",
      description: "Balanced reasoning for simpler tasks.",
      useCase: "General coding and quick queries.",
    },
    {
      name: "medium",
      description: "Advanced reasoning for moderate complexity.",
      useCase: "Standard development and problem solving.",
    },
    {
      name: "high",
      description: "Maximum reasoning depth.",
      useCase: "Complex refactoring and PhD-level research.",
    },
  ] as const;
