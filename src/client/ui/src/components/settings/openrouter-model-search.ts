const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_SEARCH_LIMIT = 20;
const TRAILING_SLASHES_PATTERN = /\/+$/u;

export interface OpenRouterModelSearchResult {
  readonly canonicalSlug: string | null;
  readonly contextLength: number | null;
  readonly description: string;
  readonly id: string;
  readonly name: string;
}

export interface OpenRouterEndpointResult {
  readonly label: string;
  readonly latencyLast30m: number | null;
  readonly name: string;
  readonly providerName: string;
  readonly status: number | null;
  readonly tag: string;
  readonly throughputLast30m: number | null;
  readonly uptimeLast30m: number | null;
}

interface OpenRouterRequestOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly fetchImplementation?: typeof fetch;
}

interface OpenRouterModelSearchOptions extends OpenRouterRequestOptions {
  readonly limit?: number;
  readonly query: string;
  readonly useUserCatalog?: boolean;
}

interface OpenRouterEndpointOptions extends OpenRouterRequestOptions {
  readonly modelId: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readNullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const normalizeBaseUrl = (baseUrl: string | undefined): string =>
  (readString(baseUrl) || DEFAULT_OPENROUTER_BASE_URL).replace(
    TRAILING_SLASHES_PATTERN,
    ""
  );

const createHeaders = (apiKey: string | undefined): HeadersInit => {
  const token = readString(apiKey);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readPayloadData = async (
  response: Response,
  context: string
): Promise<unknown> => {
  if (!response.ok) {
    throw new Error(`${context} failed with status ${response.status}`);
  }
  const payload: unknown = await response.json();
  return isRecord(payload) ? payload.data : null;
};

const mapModel = (value: unknown): OpenRouterModelSearchResult | null => {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (!id) {
    return null;
  }
  return {
    canonicalSlug: readString(value.canonical_slug) || null,
    contextLength: readNullableNumber(value.context_length),
    description: readString(value.description),
    id,
    name: readString(value.name) || id,
  };
};

const matchesQuery = (
  model: OpenRouterModelSearchResult,
  normalizedQuery: string
): boolean =>
  model.id.toLowerCase().includes(normalizedQuery) ||
  model.name.toLowerCase().includes(normalizedQuery) ||
  (model.canonicalSlug?.toLowerCase().includes(normalizedQuery) ?? false);

export const rankOpenRouterModels = (
  models: readonly OpenRouterModelSearchResult[],
  query: string,
  limit = DEFAULT_SEARCH_LIMIT
): OpenRouterModelSearchResult[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }
  return models
    .filter((model) => matchesQuery(model, normalizedQuery))
    .sort((left, right) => {
      const leftExact =
        left.id.toLowerCase() === normalizedQuery ||
        left.canonicalSlug?.toLowerCase() === normalizedQuery;
      const rightExact =
        right.id.toLowerCase() === normalizedQuery ||
        right.canonicalSlug?.toLowerCase() === normalizedQuery;
      return Number(rightExact) - Number(leftExact);
    })
    .slice(0, Math.max(1, limit));
};

export const searchOpenRouterModels = async (
  options: OpenRouterModelSearchOptions
): Promise<OpenRouterModelSearchResult[]> => {
  const query = options.query.trim();
  if (!query) {
    return [];
  }
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const path = options.useUserCatalog
    ? "/models/user"
    : `/models?${new URLSearchParams({ output_modalities: "text", q: query })}`;
  const response = await fetchImplementation(`${baseUrl}${path}`, {
    headers: createHeaders(options.apiKey),
  });
  const data = await readPayloadData(response, "OpenRouter model search");
  const models = Array.isArray(data)
    ? data.flatMap((item) => mapModel(item) ?? [])
    : [];
  return rankOpenRouterModels(models, query, options.limit);
};

const splitModelId = (modelId: string): { author: string; slug: string } => {
  const trimmed = modelId.trim();
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0 || slashIndex === trimmed.length - 1) {
    throw new Error("OpenRouter model id must use author/slug format.");
  }
  return {
    author: trimmed.slice(0, slashIndex),
    slug: trimmed.slice(slashIndex + 1),
  };
};

const mapEndpoint = (value: unknown): OpenRouterEndpointResult | null => {
  if (!isRecord(value)) {
    return null;
  }
  const tag = readString(value.tag);
  if (!tag) {
    return null;
  }
  const providerName = readString(value.provider_name) || tag;
  return {
    label: `${providerName} - ${tag}`,
    latencyLast30m: readNullableNumber(value.latency_last_30m),
    name: readString(value.name) || tag,
    providerName,
    status: readNullableNumber(value.status),
    tag,
    throughputLast30m: readNullableNumber(value.throughput_last_30m),
    uptimeLast30m: readNullableNumber(value.uptime_last_30m),
  };
};

export const loadOpenRouterModelEndpoints = async (
  options: OpenRouterEndpointOptions
): Promise<OpenRouterEndpointResult[]> => {
  const { author, slug } = splitModelId(options.modelId);
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const response = await fetchImplementation(
    `${baseUrl}/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`,
    { headers: createHeaders(options.apiKey) }
  );
  const data = await readPayloadData(response, "OpenRouter endpoint lookup");
  const endpoints = isRecord(data) ? data.endpoints : null;
  return Array.isArray(endpoints)
    ? endpoints.flatMap((item) => mapEndpoint(item) ?? [])
    : [];
};
