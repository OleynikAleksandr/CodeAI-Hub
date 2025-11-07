export type ProviderStackId = "claudeCodeCli" | "codexCli" | "geminiCli";

export type ProviderStackDescriptor = {
  readonly id: ProviderStackId;
  readonly title: string;
  readonly description: string;
  readonly connected: boolean;
  readonly statusMessage?: string | null;
};

const PROVIDER_TITLE_MAP: Record<ProviderStackId, string> = {
  claudeCodeCli: "Claude",
  codexCli: "Codex",
  geminiCli: "Gemini",
};

export const getDefaultProviderTitle = (providerId: ProviderStackId): string =>
  PROVIDER_TITLE_MAP[providerId] ?? providerId;
const PROVIDER_DESCRIPTION_MAP: Record<ProviderStackId, string> = {
  claudeCodeCli: "Using your authentication Claude Code CLI",
  codexCli: "Using your authentication Codex CLI",
  geminiCli: "Using your authentication Gemini CLI",
};

export const getDefaultProviderDescription = (
  providerId: ProviderStackId
): string => PROVIDER_DESCRIPTION_MAP[providerId] ?? "";
