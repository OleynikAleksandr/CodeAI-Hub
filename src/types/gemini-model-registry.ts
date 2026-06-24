export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high" | "off";

export type GeminiModelId =
  | "gemini-3.1-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-3.1-flash-lite-preview";

interface GeminiModelDescriptor {
  readonly description: string;
  readonly displayName: string;
  readonly family: "gemini-3";
  readonly id: GeminiModelId;
  readonly status: "preview" | "generally_available";
  readonly supportedThinkingLevels: readonly GeminiThinkingLevel[];
}

const GEMINI_RECOMMENDED_MODELS: readonly GeminiModelDescriptor[] = [
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
  {
    id: "gemini-3.1-flash-lite-preview",
    displayName: "Gemini 3.1 Flash Lite",
    description: "Lightweight model with fast responses and low cost.",
    status: "preview",
    family: "gemini-3",
    supportedThinkingLevels: ["off", "minimal", "low"],
  },
] as const;

export const GEMINI_MODEL_ID_SET = new Set<GeminiModelId>(
  GEMINI_RECOMMENDED_MODELS.map((model) => model.id)
);

export const DEFAULT_GEMINI_MODEL_ID: GeminiModelId = "gemini-3.1-pro-preview";
