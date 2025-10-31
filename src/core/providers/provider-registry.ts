import type { ProviderStackDescriptor } from "../../types/provider";

/**
 * Describes the set of provider stacks currently available to the extension.
 * In the future this registry will interrogate installed CLIs. For now it
 * returns static stubs that mark the stacks as connected.
 */
export class ProviderRegistry {
  listStacks(): readonly ProviderStackDescriptor[] {
    return this.stacks;
  }

  private readonly stacks: readonly ProviderStackDescriptor[] = [
    {
      id: "claudeCodeCli",
      title: "Claude",
      description: "Using your authentication Claude CLI.",
      connected: true,
    },
    {
      id: "codexCli",
      title: "Codex",
      description: "Using your authentication Codex CLI.",
      connected: true,
    },
    {
      id: "geminiCli",
      title: "Gemini",
      description: "Using your authentication Gemini CLI.",
      connected: true,
    },
  ];
}
