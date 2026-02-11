export type CodexModelPlatform =
  | "CLI"
  | "SDK"
  | "IDE Extension"
  | "Cloud"
  | "API";

export type CodexModelStatus = "active" | "succeeded_by";
export type CodexModelTier = "flagship" | "max" | "mini" | "general";

export type CodexRecommendedModelDescriptor = {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly platforms: readonly CodexModelPlatform[];
  readonly status: CodexModelStatus;
  readonly tier: CodexModelTier;
};

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
    id: "gpt-5.1-codex-max",
    displayName: "GPT-5.1-Codex-Max",
    description: "Optimized for long-horizon, agentic coding tasks in Codex",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "max",
  },
  {
    id: "gpt-5.1-codex-mini",
    displayName: "GPT-5.1-Codex-Mini",
    description:
      "Smaller, more cost-effective, less-capable version of GPT-5.1-Codex",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "mini",
  },
  {
    id: "gpt-5.2",
    displayName: "GPT-5.2",
    description: "Best general agentic model for tasks across industries",
    platforms: ["CLI", "SDK", "IDE Extension", "Cloud", "API"],
    status: "active",
    tier: "general",
  },
] as const satisfies readonly CodexRecommendedModelDescriptor[];

export type CodexRecommendedModelId =
  (typeof CODEX_RECOMMENDED_MODELS)[number]["id"];

export type CodexLegacyModelDescriptor = {
  readonly id: string;
  readonly displayName: string;
  readonly description: string;
  readonly status: "succeeded_by";
  readonly successor: string;
};

export const CODEX_LEGACY_MODELS = [
  {
    id: "gpt-5.2-codex",
    displayName: "GPT-5.2-Codex",
    description:
      "Most advanced agentic coding model for real-world engineering",
    status: "succeeded_by",
    successor: "gpt-5.3-codex",
  },
  {
    id: "gpt-5.1",
    displayName: "GPT-5.1",
    description: "For coding and agentic tasks",
    status: "succeeded_by",
    successor: "gpt-5.2",
  },
  {
    id: "gpt-5.1-codex",
    displayName: "GPT-5.1-Codex",
    description: "Optimized for long-running agentic coding",
    status: "succeeded_by",
    successor: "gpt-5.1-codex-max",
  },
  {
    id: "gpt-5-codex",
    displayName: "GPT-5-Codex",
    description: "Tuned for long-running agentic coding",
    status: "succeeded_by",
    successor: "gpt-5.1-codex",
  },
  {
    id: "gpt-5-codex-mini",
    displayName: "GPT-5-Codex-Mini",
    description: "Cost-effective predecessor",
    status: "succeeded_by",
    successor: "gpt-5.1-codex-mini",
  },
  {
    id: "gpt-5",
    displayName: "GPT-5",
    description: "Reasoning model for coding tasks",
    status: "succeeded_by",
    successor: "gpt-5.1",
  },
] as const satisfies readonly CodexLegacyModelDescriptor[];

export type CodexLegacyModelId = (typeof CODEX_LEGACY_MODELS)[number]["id"];

export type CodexModelId = CodexRecommendedModelId | CodexLegacyModelId;

export type CodexModelDescriptor =
  | CodexRecommendedModelDescriptor
  | CodexLegacyModelDescriptor;

export const CODEX_ALL_MODELS: readonly CodexModelDescriptor[] = [
  ...CODEX_RECOMMENDED_MODELS,
  ...CODEX_LEGACY_MODELS,
];

export const DEFAULT_CODEX_MODEL_ID: CodexRecommendedModelId = "gpt-5.3-codex";

export type CodexReasoningLevel = "low" | "medium" | "high" | "xhigh";

export type CodexReasoningLevelDescriptor = {
  readonly name: CodexReasoningLevel;
  readonly description: string;
  readonly useCase: string;
  readonly default: boolean;
};

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
