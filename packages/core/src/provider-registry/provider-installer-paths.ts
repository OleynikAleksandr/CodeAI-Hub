import type { ClaudeInstallerPaths } from "@codeai-hub/claude-module";
import type { CodexInstallerPaths } from "@codeai-hub/codex-module";

const NPM_GLOBAL_MODULES_ROOT_UNIX = "~/.npm-global/lib/node_modules";
const NPM_GLOBAL_MODULES_ROOT_WINDOWS =
  "%USERPROFILE%\\AppData\\Roaming\\npm\\node_modules";
const PROVIDERS_HOME_UNIX = "~/.codeai-hub/providers";
const PROVIDERS_HOME_WINDOWS = "%USERPROFILE%\\.codeai-hub\\providers";

export interface GeminiInstallerPaths {
  readonly linux: string;
  readonly macOS: string;
  readonly windows: string;
}

export const CLAUDE_INSTALLER_PATHS: ClaudeInstallerPaths = {
  macOS: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@anthropic-ai/claude-agent-sdk/`,
  linux: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@anthropic-ai/claude-agent-sdk/`,
  windows: `${NPM_GLOBAL_MODULES_ROOT_WINDOWS}\\@anthropic-ai\\claude-agent-sdk\\`,
};

export const CODEX_INSTALLER_PATHS: CodexInstallerPaths = {
  macOS: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@openai/codex-sdk/`,
  linux: `${NPM_GLOBAL_MODULES_ROOT_UNIX}/@openai/codex-sdk/`,
  windows: `${NPM_GLOBAL_MODULES_ROOT_WINDOWS}\\@openai\\codex-sdk\\`,
};

export const GEMINI_INSTALLER_PATHS: GeminiInstallerPaths = {
  macOS: `${PROVIDERS_HOME_UNIX}/gemini/cli/`,
  linux: `${PROVIDERS_HOME_UNIX}/gemini/cli/`,
  windows: `${PROVIDERS_HOME_WINDOWS}\\gemini\\cli\\`,
};
