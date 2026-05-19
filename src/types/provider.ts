export type KnownProviderStackId =
  | "claudeCodeCli"
  | "codexCli"
  | "geminiCli"
  | "kimiCode"
  | "kimiClaudeCode";
export type ProviderStackId = string;

export interface ProviderStackDescriptor {
  readonly connected: boolean;
  readonly description: string;
  readonly id: ProviderStackId;
  readonly statusMessage?: string | null;
  readonly title: string;
}

const PROVIDER_TITLE_MAP: Partial<Record<ProviderStackId, string>> = {
  claudeCodeCli: "Claude",
  codexCli: "Codex",
  geminiCli: "Gemini",
  kimiCode: "Kimi",
  kimiClaudeCode: "Kimi Claude Code",
};

export const getDefaultProviderTitle = (providerId: ProviderStackId): string =>
  PROVIDER_TITLE_MAP[providerId] ?? providerId;
const PROVIDER_DESCRIPTION_MAP: Partial<Record<ProviderStackId, string>> = {
  claudeCodeCli: "Using your authentication Claude Code CLI",
  codexCli: "Using your authentication Codex CLI",
  geminiCli: "Using your authentication Gemini CLI",
  kimiCode: "Using your authentication Kimi CLI",
  kimiClaudeCode: "Using Kimi 2.6 through Claude Code-compatible runtime",
};

export const getDefaultProviderDescription = (
  providerId: ProviderStackId
): string => PROVIDER_DESCRIPTION_MAP[providerId] ?? "";
