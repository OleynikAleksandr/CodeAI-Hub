export type Provider = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: "active" | "inactive";
};

const MOCK_PROVIDERS: Provider[] = [
  {
    id: "claudeCodeCli",
    name: "Claude Code CLI",
    description: "Mock provider for Claude-based workflows",
    status: "active",
  },
  {
    id: "codexCli",
    name: "OpenAI Codex CLI",
    description: "Mock provider for Codex-based code generation",
    status: "active",
  },
  {
    id: "geminiCli",
    name: "Google Gemini CLI",
    description: "Mock provider for Gemini experiments",
    status: "active",
  },
];

export class ProviderRegistry {
  private readonly providers: Provider[];

  constructor(initialProviders: Provider[] = MOCK_PROVIDERS) {
    this.providers = [...initialProviders];
  }

  listProviders(): Provider[] {
    return this.providers;
  }
}
