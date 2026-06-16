import {
  resolveClaudeProviderHome,
  resolveClaudeProviderProjectDir,
} from "./claude-provider-home";
import { CODEAI_CLAUDE_WORKFLOW_TOOLS } from "./claude-workflow-system-prompt";

export type ClaudeRuntimeProfileId = "claudeCode";
export type ClaudeRuntimeAuthMode = "anthropic-api-key" | "subscription";

export interface ClaudeCodeRuntimeProfile {
  readonly authMode: ClaudeRuntimeAuthMode;
  readonly id: ClaudeRuntimeProfileId;
  readonly projectPath: string;
  readonly providerHome: string;
  readonly sessionTitle?: string;
  readonly settingSources: readonly string[];
  readonly toolNames: readonly string[];
}

export interface ClaudeCodeRuntimeProfileOptions {
  readonly projectSlug: string;
}

export const buildClaudeCodeRuntimeProfile = (
  options: ClaudeCodeRuntimeProfileOptions
): ClaudeCodeRuntimeProfile => ({
  authMode: "subscription",
  id: "claudeCode",
  projectPath: resolveClaudeProviderProjectDir(options.projectSlug),
  providerHome: resolveClaudeProviderHome(),
  settingSources: [],
  toolNames: [...CODEAI_CLAUDE_WORKFLOW_TOOLS],
});
