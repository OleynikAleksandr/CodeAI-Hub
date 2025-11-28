import type { SessionListener as BaseSessionListener } from "./provider/gemini-provider-adapter";
import { GeminiProviderAdapter as BaseGeminiProviderAdapter } from "./provider/gemini-provider-adapter";
import type {
	GeminiCredentialsOptions as BaseGeminiCredentialsOptions,
	GeminiInstallerPaths as BaseGeminiInstallerPaths,
	GeminiModuleOptions as BaseGeminiModuleOptions,
	GeminiSessionEvent as BaseGeminiSessionEvent,
	GeminiWorkspaceOptions as BaseGeminiWorkspaceOptions,
	ModuleReporter as BaseModuleReporter,
} from "./types";

export class GeminiProviderAdapter extends BaseGeminiProviderAdapter {}
export type SessionListener = BaseSessionListener;
export type GeminiInstallerPaths = BaseGeminiInstallerPaths;
export type GeminiModuleOptions = BaseGeminiModuleOptions;
export type GeminiWorkspaceOptions = BaseGeminiWorkspaceOptions;
export type GeminiCredentialsOptions = BaseGeminiCredentialsOptions;
export type GeminiSessionEvent = BaseGeminiSessionEvent;
export type ModuleReporter = BaseModuleReporter;

export const GEMINI_MODULE_BRIDGE_READY = true;
