export type ProviderStackId = "claudeCodeCli" | "codexCli" | "geminiCli";

export type ProviderVersionDetail = {
  readonly version?: string;
  readonly cliPath?: string;
  readonly unchecked?: boolean;
};

export type ProviderVersionInfo = {
  readonly codeAiHub?: ProviderVersionDetail;
  readonly vendor: ProviderVersionDetail;
  readonly global?: ProviderVersionDetail;
  readonly lastCheckedAt?: string;
};

export type ProviderStackDescriptor = {
  readonly id: ProviderStackId;
  readonly title: string;
  readonly description: string;
  readonly connected: boolean;
  readonly statusMessage?: string | null;
  readonly versionInfo?: ProviderVersionInfo;
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
