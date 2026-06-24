export type KnownProviderStackId =
  | "claudeCodeCli"
  | "codexCli"
  | "glmNative"
  | "glmOpenCode"
  | "kimiCode"
  | "localModels"
  | "openRouter";
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
  glmNative: "GLM",
  glmOpenCode: "OpenCode",
  kimiCode: "Kimi",
  localModels: "Local Models",
  openRouter: "OpenRouter",
};

export const getDefaultProviderTitle = (providerId: ProviderStackId): string =>
  PROVIDER_TITLE_MAP[providerId] ?? providerId;
const PROVIDER_DESCRIPTION_MAP: Partial<Record<ProviderStackId, string>> = {
  claudeCodeCli: "Using your authentication Claude Code CLI",
  codexCli: "Using your authentication Codex CLI",
  glmNative: "Uses the native Z.AI GLM API",
  glmOpenCode: "Using OpenCode providers and models",
  kimiCode: "Using your authentication Kimi CLI",
  localModels: "Runs downloaded LM Studio models on this Mac",
  openRouter: "Routes standalone chats through OpenRouter",
};

export const getDefaultProviderDescription = (
  providerId: ProviderStackId
): string => PROVIDER_DESCRIPTION_MAP[providerId] ?? "";
