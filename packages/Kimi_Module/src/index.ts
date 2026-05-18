import {
  KIMI_PROVIDER_ID as BASE_KIMI_PROVIDER_ID,
  type KimiModuleOptions as BaseKimiModuleOptions,
  KimiProviderAdapter as BaseKimiProviderAdapter,
  type KimiSessionEvent as BaseKimiSessionEvent,
  type KimiWorkspaceOptions as BaseKimiWorkspaceOptions,
  type ModuleReporter as BaseModuleReporter,
  type SessionListener as BaseSessionListener,
} from "./provider/kimi-provider-adapter";

export class KimiProviderAdapter extends BaseKimiProviderAdapter {}

export const KIMI_PROVIDER_ID = BASE_KIMI_PROVIDER_ID;
export const KIMI_MODULE_BRIDGE_READY = true;

export type KimiModuleOptions = BaseKimiModuleOptions;
export type KimiWorkspaceOptions = BaseKimiWorkspaceOptions;
export type KimiSessionEvent = BaseKimiSessionEvent;
export type ModuleReporter = BaseModuleReporter;
export type SessionListener = BaseSessionListener;
