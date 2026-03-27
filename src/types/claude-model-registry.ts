export type ClaudeModelAliasId = "sonnet" | "opus" | "haiku";

export interface ClaudeModelAliasDescriptor {
  readonly alias: ClaudeModelAliasId;
  readonly description: string;
  readonly displayName: string;
  readonly status: "active";
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
