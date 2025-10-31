export type ProviderStackId = "claudeCodeCli" | "codexCli" | "geminiCli";

export type ProviderStackDescriptor = {
  readonly id: ProviderStackId;
  readonly title: string;
  readonly description: string;
  readonly connected: boolean;
};

const PROVIDER_TITLE_MAP: Record<ProviderStackId, string> = {
  claudeCodeCli: "Claude",
  codexCli: "Codex",
  geminiCli: "Gemini",
};

export const getDefaultProviderTitle = (providerId: ProviderStackId): string =>
  PROVIDER_TITLE_MAP[providerId] ?? providerId;
