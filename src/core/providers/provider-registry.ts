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
      title: "Claude Code CLI",
      description:
        "Anthropic Claude Agent SDK integration. Requires global Claude CLI install.",
      connected: true,
    },
    {
      id: "codexCli",
      title: "Codex CLI",
      description: "OpenAI Codex CLI integration with local sandbox controls.",
      connected: true,
    },
    {
      id: "geminiCli",
      title: "Gemini CLI",
      description:
        "Google Gemini CLI with OAuth login and JSON output pipeline.",
      connected: true,
    },
  ];
}
