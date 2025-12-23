export type ClaudeModelAliasId = "default" | "sonnet" | "opus" | "haiku";

export type ClaudeModelAliasDescriptor = {
  readonly alias: ClaudeModelAliasId;
  readonly displayName: string;
  readonly description: string;
  readonly status: "active";
};

export const CLAUDE_MODEL_ALIASES: readonly ClaudeModelAliasDescriptor[] = [
  {
    alias: "default",
    displayName: "Default · Sonnet 4.5",
    description:
      "Best for everyday tasks. Alias `sonnet` maps to the same release (claude-sonnet-4-5-20250929).",
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
  "sonnet",
]);

export const DEFAULT_CLAUDE_MODEL_ALIAS: ClaudeModelAliasId = "default";
