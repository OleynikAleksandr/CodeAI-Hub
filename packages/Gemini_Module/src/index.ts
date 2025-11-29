import {
  GeminiInstaller as BaseGeminiInstaller,
  type GeminiInstallerOptions as BaseGeminiInstallerOptions,
} from "./installer/gemini-installer";
import type { SessionListener as BaseSessionListener } from "./provider/gemini-provider-adapter";
import { GeminiProviderAdapter as BaseGeminiProviderAdapter } from "./provider/gemini-provider-adapter";
import type {
  GeminiCredentialsOptions as BaseGeminiCredentialsOptions,
  GeminiInstallerPaths as BaseGeminiInstallerPaths,
  GeminiModuleOptions as BaseGeminiModuleOptions,
  GeminiSessionEvent as BaseGeminiSessionEvent,
  GeminiUpdateResult as BaseGeminiUpdateResult,
  GeminiWorkspaceOptions as BaseGeminiWorkspaceOptions,
  ModuleReporter as BaseModuleReporter,
} from "./types";

export class GeminiProviderAdapter extends BaseGeminiProviderAdapter {}
export class GeminiInstaller extends BaseGeminiInstaller {}
export type SessionListener = BaseSessionListener;
export type GeminiInstallerPaths = BaseGeminiInstallerPaths;
export type GeminiInstallerOptions = BaseGeminiInstallerOptions;
export type GeminiModuleOptions = BaseGeminiModuleOptions;
export type GeminiWorkspaceOptions = BaseGeminiWorkspaceOptions;
export type GeminiCredentialsOptions = BaseGeminiCredentialsOptions;
export type GeminiSessionEvent = BaseGeminiSessionEvent;
export type GeminiUpdateResult = BaseGeminiUpdateResult;
export type ModuleReporter = BaseModuleReporter;

export const GEMINI_MODULE_BRIDGE_READY = true;
