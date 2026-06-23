import assert from "node:assert/strict";
import test from "node:test";
import {
  loadOpenRouterModelEndpoints,
  rankOpenRouterModels,
  searchOpenRouterModels,
} from "./openrouter-model-search";

const MODELS_QUERY_PATTERN = /\/models\?/u;
const MODEL_QUERY_PARAM_PATTERN = /q=openai%2Fgpt-5-nano/u;
const USER_MODELS_PATTERN = /\/models\/user/u;

const createJsonResponse = (payload: unknown): Response =>
  ({
    json: () => Promise.resolve(payload),
    ok: true,
    status: 200,
  }) as Response;

test("rankOpenRouterModels puts exact slug matches first", () => {
  const results = rankOpenRouterModels(
    [
      {
        canonicalSlug: "openai/gpt-5-nano-2025-08-07",
        contextLength: 400_000,
        description: "",
        id: "openai/gpt-5-nano-preview",
        name: "Preview",
      },
      {
        canonicalSlug: "openai/gpt-5-nano-2025-08-07",
        contextLength: 400_000,
        description: "",
        id: "openai/gpt-5-nano",
        name: "OpenAI: GPT-5 Nano",
      },
    ],
    "openai/gpt-5-nano"
  );

  assert.equal(results[0]?.id, "openai/gpt-5-nano");
});

test("searchOpenRouterModels queries public model search with q", async () => {
  const requestedUrls: string[] = [];
  const fetchImplementation = ((url) => {
    requestedUrls.push(String(url));
    return Promise.resolve(
      createJsonResponse({
        data: [
          {
            canonical_slug: "openai/gpt-5-nano-2025-08-07",
            context_length: 400_000,
            description: "Small GPT-5 model",
            id: "openai/gpt-5-nano",
            name: "OpenAI: GPT-5 Nano",
          },
        ],
      })
    );
  }) as typeof fetch;

  const results = await searchOpenRouterModels({
    fetchImplementation,
    query: "openai/gpt-5-nano",
  });

  assert.equal(results[0]?.id, "openai/gpt-5-nano");
  assert.match(requestedUrls[0] ?? "", MODELS_QUERY_PATTERN);
  assert.match(requestedUrls[0] ?? "", MODEL_QUERY_PARAM_PATTERN);
});

test("searchOpenRouterModels can use user-filtered catalog", async () => {
  const requestedUrls: string[] = [];
  const fetchImplementation = ((url, init) => {
    requestedUrls.push(`${String(url)} ${String(init?.headers)}`);
    return Promise.resolve(
      createJsonResponse({
        data: [
          { id: "openai/gpt-5-mini", name: "OpenAI: GPT-5 Mini" },
          { id: "openai/gpt-5-nano", name: "OpenAI: GPT-5 Nano" },
        ],
      })
    );
  }) as typeof fetch;

  const results = await searchOpenRouterModels({
    apiKey: "key",
    fetchImplementation,
    query: "nano",
    useUserCatalog: true,
  });

  assert.deepEqual(
    results.map((model) => model.id),
    ["openai/gpt-5-nano"]
  );
  assert.match(requestedUrls[0] ?? "", USER_MODELS_PATTERN);
});

test("loadOpenRouterModelEndpoints maps provider tags into labels", async () => {
  const requestedUrls: string[] = [];
  const fetchImplementation = ((url) => {
    requestedUrls.push(String(url));
    return Promise.resolve(
      createJsonResponse({
        data: {
          endpoints: [
            {
              latency_last_30m: null,
              name: "Azure | openai/gpt-5-nano-2025-08-07",
              provider_name: "Azure",
              status: 0,
              tag: "azure/swedencentral",
              throughput_last_30m: null,
              uptime_last_30m: 98.3,
            },
            {
              name: "OpenAI | openai/gpt-5-nano-2025-08-07",
              provider_name: "OpenAI",
              tag: "openai",
            },
          ],
        },
      })
    );
  }) as typeof fetch;

  const endpoints = await loadOpenRouterModelEndpoints({
    fetchImplementation,
    modelId: "openai/gpt-5-nano",
  });

  assert.equal(
    requestedUrls[0],
    "https://openrouter.ai/api/v1/models/openai/gpt-5-nano/endpoints"
  );
  assert.deepEqual(
    endpoints.map((endpoint) => endpoint.label),
    ["Azure - azure/swedencentral", "OpenAI - openai"]
  );
});
