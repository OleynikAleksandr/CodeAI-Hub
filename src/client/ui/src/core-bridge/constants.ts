import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
  type ProviderStackId,
} from "../../../../types/provider";
import type { CoreBridgeConfig } from "./types";

export const DEFAULT_CONFIG: CoreBridgeConfig = {
  httpUrl: "http://127.0.0.1:8080",
  wsUrl: "ws://127.0.0.1:8080/api/v1/stream",
};

const DEFAULT_PROVIDER_IDS: ProviderStackId[] = [
  "claudeCodeCli",
  "codexCli",
  "localModels",
  "glmNative",
  "glmOpenCode",
];

export const FALLBACK_PROVIDERS: ProviderStackDescriptor[] =
  DEFAULT_PROVIDER_IDS.map((providerId) => ({
    id: providerId,
    title: getDefaultProviderTitle(providerId),
    description: getDefaultProviderDescription(providerId),
    connected: true,
  }));
