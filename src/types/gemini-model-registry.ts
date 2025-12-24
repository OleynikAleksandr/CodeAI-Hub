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
};

export const GEMINI_RECOMMENDED_MODELS: readonly GeminiModelDescriptor[] = [
  {
    id: "gemini-3-pro-preview",
    displayName: "Gemini 3 Pro Preview",
    description: "Most advanced reasoning Gemini model for complex problems.",
    status: "preview",
    family: "gemini-3",
  },
  {
    id: "gemini-3-flash-preview",
    displayName: "Gemini 3 Flash Preview",
    description: "Pro-grade reasoning with Flash-level latency and cost.",
    status: "preview",
    family: "gemini-3",
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Deep reasoning model with Think mode for complex use cases.",
    status: "generally_available",
    family: "gemini-2.5",
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "High-throughput model for enterprise tasks.",
    status: "generally_available",
    family: "gemini-2.5",
  },
  {
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    description: "Most cost-efficient and fastest 2.5 model.",
    status: "generally_available",
    family: "gemini-2.5",
  },
] as const;

export const GEMINI_MODEL_ID_SET = new Set<GeminiModelId>(
  GEMINI_RECOMMENDED_MODELS.map((model) => model.id)
);

export const DEFAULT_GEMINI_MODEL_ID: GeminiModelId = "gemini-3-pro-preview";
