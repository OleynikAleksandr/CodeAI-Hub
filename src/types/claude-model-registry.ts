export type ClaudeModelAliasId = "sonnet" | "opus" | "haiku";
export type ClaudeThinkingEffort = "low" | "medium" | "high" | "max";

export interface ClaudeModelAliasDescriptor {
  readonly alias: ClaudeModelAliasId;
  readonly description: string;
  readonly displayName: string;
  readonly status: "active";
}

export interface ClaudeThinkingEffortDescriptor {
  readonly default: boolean;
  readonly description: string;
  readonly name: ClaudeThinkingEffort;
  readonly useCase: string;
}

export const CLAUDE_MODEL_ALIASES: readonly ClaudeModelAliasDescriptor[] = [
  {
    alias: "sonnet",
    displayName: "Sonnet 4.5",
    description: "Best for everyday tasks (claude-sonnet-4-5-20250929).",
    status: "active",
  },
  {
    alias: "opus",
    displayName: "Opus 4.5",
    description: "Most capable for complex, agentic workloads.",
    status: "active",
  },
  {
    alias: "haiku",
    displayName: "Haiku 4.5",
    description: "Fastest alias for quick answers and prototyping.",
    status: "active",
  },
] as const;

export const CLAUDE_MODEL_ALIAS_SET = new Set<ClaudeModelAliasId>([
  ...CLAUDE_MODEL_ALIASES.map((model) => model.alias),
]);

export const DEFAULT_CLAUDE_MODEL_ALIAS: ClaudeModelAliasId = "sonnet";

export const CLAUDE_THINKING_EFFORTS = [
  {
    name: "low",
    description: "Lighter reasoning for faster Claude turns.",
    useCase: "Simple prompts and quick follow-ups.",
    default: false,
  },
  {
    name: "medium",
    description: "Balanced reasoning depth for everyday work.",
    useCase: "Default choice for most sessions.",
    default: true,
  },
  {
    name: "high",
    description: "Deeper reasoning for more complex tasks.",
    useCase: "Architecture work, investigations, and larger plans.",
    default: false,
  },
  {
    name: "max",
    description: "Maximum reasoning effort currently exposed by Claude.",
    useCase: "Hardest tasks where latency matters less than depth.",
    default: false,
  },
] as const satisfies readonly ClaudeThinkingEffortDescriptor[];

export const CLAUDE_THINKING_EFFORT_SET = new Set<ClaudeThinkingEffort>(
  CLAUDE_THINKING_EFFORTS.map((effort) => effort.name)
);

export const DEFAULT_CLAUDE_THINKING_EFFORT: ClaudeThinkingEffort = "medium";
