export type CodexModelPlatform =
  | "CLI"
  | "SDK"
  | "IDE Extension"
  | "Cloud"
  | "API";

export type CodexModelStatus = "active" | "succeeded_by";
export type CodexModelTier = "flagship" | "max" | "mini" | "general";

export interface CodexRecommendedModelDescriptor {
  readonly description: string;
  readonly displayName: string;
  readonly id: string;
  readonly platforms: readonly CodexModelPlatform[];
  readonly status: CodexModelStatus;
  readonly tier: CodexModelTier;
}

export const CODEX_RECOMMENDED_MODELS = [
  {
    id: "gpt-5.3-codex",
    displayName: "GPT-5.3-Codex",
    description:
      "Most advanced agentic coding model for real-world engineering",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "flagship",
  },
  {
    id: "gpt-5.4",
    displayName: "GPT-5.4",
    description: "Best general agentic model for tasks across industries",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "general",
  },
  {
    id: "gpt-5.4-mini",
    displayName: "GPT-5.4 Mini",
    description: "Smaller GPT-5.4 variant for faster everyday coding tasks",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "mini",
  },
] as const satisfies readonly CodexRecommendedModelDescriptor[];

export type CodexRecommendedModelId =
  (typeof CODEX_RECOMMENDED_MODELS)[number]["id"];

export const CODEX_SETTINGS_MODELS = [
  {
    id: "gpt-5.3-codex",
    displayName: "GPT-5.3-Codex",
    description:
      "Most advanced agentic coding model for real-world engineering",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "flagship",
  },
  {
    id: "gpt-5.4",
    displayName: "GPT-5.4",
    description: "Best general agentic model for tasks across industries",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "general",
  },
  {
    id: "gpt-5.4-mini",
    displayName: "GPT-5.4 Mini",
    description: "Smaller GPT-5.4 variant for faster everyday coding tasks",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "mini",
  },
] as const satisfies readonly CodexRecommendedModelDescriptor[];

export interface CodexLegacyModelDescriptor {
  readonly description: string;
  readonly displayName: string;
  readonly id: string;
  readonly status: "succeeded_by";
  readonly successor: string;
}

export const CODEX_LEGACY_MODELS =
  [] as const satisfies readonly CodexLegacyModelDescriptor[];

export type CodexLegacyModelId = (typeof CODEX_LEGACY_MODELS)[number]["id"];

export type CodexModelId = CodexRecommendedModelId | CodexLegacyModelId;

export type CodexModelDescriptor =
  | CodexRecommendedModelDescriptor
  | CodexLegacyModelDescriptor;

export const DEFAULT_CODEX_MODEL_ID: CodexRecommendedModelId = "gpt-5.3-codex";

export type CodexReasoningLevel = "low" | "medium" | "high" | "xhigh";

export interface CodexReasoningLevelDescriptor {
  readonly default: boolean;
  readonly description: string;
  readonly name: CodexReasoningLevel;
  readonly useCase: string;
}

export const CODEX_REASONING_LEVELS = [
  {
    name: "low",
    description: "Fast responses with lighter reasoning",
    useCase: "Quick tasks, simple queries",
    default: false,
  },
  {
    name: "medium",
    description: "Balances speed and reasoning depth for everyday tasks",
    useCase: "Most development tasks",
    default: true,
  },
  {
    name: "high",
    description: "Greater reasoning depth for complex problems",
    useCase: "Complex refactoring, architecture decisions",
    default: false,
  },
  {
    name: "xhigh",
    description: "Extra high reasoning depth for complex problems",
    useCase: "Very complex problems requiring deep analysis",
    default: false,
  },
] as const satisfies readonly CodexReasoningLevelDescriptor[];

export const DEFAULT_CODEX_REASONING_LEVEL: CodexReasoningLevel = "medium";
