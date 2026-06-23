export interface OpenRouterSettings {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly defaultModel: string;
  readonly endpointTag: string;
}

export interface RawOpenRouterSettings {
  readonly apiKey?: unknown;
  readonly baseUrl?: unknown;
  readonly defaultModel?: unknown;
  readonly endpointTag?: unknown;
}

const mapOptionalString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

export const mapOpenRouterSettings = (
  value: RawOpenRouterSettings | undefined
): OpenRouterSettings => ({
  apiKey: mapOptionalString(value?.apiKey),
  baseUrl: mapOptionalString(value?.baseUrl),
  defaultModel: mapOptionalString(value?.defaultModel),
  endpointTag: mapOptionalString(value?.endpointTag),
});
