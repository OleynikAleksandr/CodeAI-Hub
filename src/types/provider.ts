export type KnownProviderStackId =
  | "claudeCodeCli"
  | "codexCli"
  | "geminiCli"
  | "glmOpenCode"
  | "kimiCode"
  | "localModels";
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
  glmOpenCode: "OpenCode",
  kimiCode: "Kimi",
  localModels: "Local Models",
};

export const getDefaultProviderTitle = (providerId: ProviderStackId): string =>
  PROVIDER_TITLE_MAP[providerId] ?? providerId;
const PROVIDER_DESCRIPTION_MAP: Partial<Record<ProviderStackId, string>> = {
  claudeCodeCli: "Using your authentication Claude Code CLI",
  codexCli: "Using your authentication Codex CLI",
  geminiCli: "Using your authentication Gemini CLI",
  glmOpenCode: "Using OpenCode providers and models",
  kimiCode: "Using your authentication Kimi CLI",
  localModels: "Runs downloaded LM Studio models on this Mac",
};

export const getDefaultProviderDescription = (
  providerId: ProviderStackId
): string => PROVIDER_DESCRIPTION_MAP[providerId] ?? "";
