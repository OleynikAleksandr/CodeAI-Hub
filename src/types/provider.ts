export type ProviderStackId = "claudeCodeCli" | "codexCli" | "geminiCli";

export type ProviderStackDescriptor = {
  readonly id: ProviderStackId;
  readonly title: string;
  readonly description: string;
  readonly connected: boolean;
};
