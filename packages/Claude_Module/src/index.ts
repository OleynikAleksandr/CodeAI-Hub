import { ClaudeProviderAdapter as ClaudeProviderAdapterImpl } from "./provider/claude-provider-adapter";
import type {
  ClaudeInstallerPaths as ClaudeInstallerPathsType,
  ClaudeModuleOptions as ClaudeModuleOptionsType,
  ClaudeUsageLimitsFacadeBridge as ClaudeUsageLimitsFacadeBridgeType,
  ClaudeUsageLimitsStreamPayload as ClaudeUsageLimitsStreamPayloadType,
  ClaudeWorkspaceOptions as ClaudeWorkspaceOptionsType,
  ModuleReporter as ModuleReporterType,
} from "./types";

const ClaudeProviderAdapter = ClaudeProviderAdapterImpl;
type ClaudeInstallerPaths = ClaudeInstallerPathsType;
type ClaudeModuleOptions = ClaudeModuleOptionsType;
type ClaudeUsageLimitsFacadeBridge = ClaudeUsageLimitsFacadeBridgeType;
type ClaudeUsageLimitsStreamPayload = ClaudeUsageLimitsStreamPayloadType;
type ClaudeWorkspaceOptions = ClaudeWorkspaceOptionsType;
type ModuleReporter = ModuleReporterType;

export { ClaudeProviderAdapter };
export type {
  ClaudeInstallerPaths,
  ClaudeModuleOptions,
  ClaudeUsageLimitsFacadeBridge,
  ClaudeUsageLimitsStreamPayload,
  ClaudeWorkspaceOptions,
  ModuleReporter,
};
