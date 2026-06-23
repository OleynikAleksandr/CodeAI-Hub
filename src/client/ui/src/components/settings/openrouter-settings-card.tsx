import type { CSSProperties, FC } from "react";
import { useEffect, useState } from "react";
import {
  loadOpenRouterModelEndpoints,
  type OpenRouterEndpointResult,
  type OpenRouterModelSearchResult,
  searchOpenRouterModels,
} from "./openrouter-model-search";
import type { OpenRouterSettings } from "./openrouter-settings-state";
import SettingsCard from "./settings-card";
import {
  descriptionStyles,
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  noteStyles,
  rowBaseStyles,
  rowSelectedStyles,
} from "./shared-model-card-styles";

interface OpenRouterSettingsCardProps {
  readonly onSettingsChange?: (settings: OpenRouterSettings) => void;
  readonly settings?: OpenRouterSettings;
}

const emptyOpenRouterSettings: OpenRouterSettings = {
  apiKey: "",
  baseUrl: "",
  defaultModel: "",
  endpointTag: "",
};

const fieldStyles: CSSProperties = {
  display: "grid",
  gap: "4px",
  margin: "8px 0",
};

const labelStyles: CSSProperties = {
  color: "#999999",
  fontSize: "12px",
};

const inputStyles: CSSProperties = {
  background: "var(--vscode-input-background)",
  border: "1px solid var(--vscode-input-border, #3c3c3c)",
  borderRadius: "4px",
  color: "var(--vscode-input-foreground)",
  fontFamily: "var(--vscode-editor-font-family, monospace)",
  fontSize: "12px",
  minHeight: "28px",
  padding: "4px 8px",
};

const mutedStyles: CSSProperties = {
  color: "#a8b3bf",
  fontSize: "12px",
  lineHeight: 1.5,
  margin: 0,
};

const normalizeSearchSeed = (settings: OpenRouterSettings): string =>
  settings.defaultModel || "";

const OpenRouterSettingsCard: FC<OpenRouterSettingsCardProps> = ({
  onSettingsChange,
  settings,
}) => {
  const current = settings ?? emptyOpenRouterSettings;
  const [query, setQuery] = useState(() => normalizeSearchSeed(current));
  const [models, setModels] = useState<OpenRouterModelSearchResult[]>([]);
  const [endpoints, setEndpoints] = useState<OpenRouterEndpointResult[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [endpointsLoading, setEndpointsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(current.defaultModel || "");
  }, [current.defaultModel]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    setError(null);
    searchOpenRouterModels({
      apiKey: current.apiKey,
      baseUrl: current.baseUrl,
      query: trimmedQuery,
    })
      .then((results) => {
        if (!cancelled) {
          setModels(results);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setModels([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModelsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current.apiKey, current.baseUrl, query]);

  useEffect(() => {
    if (!current.defaultModel) {
      setEndpoints([]);
      return;
    }
    let cancelled = false;
    setEndpointsLoading(true);
    setError(null);
    loadOpenRouterModelEndpoints({
      apiKey: current.apiKey,
      baseUrl: current.baseUrl,
      modelId: current.defaultModel,
    })
      .then((results) => {
        if (!cancelled) {
          setEndpoints(results);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setEndpoints([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEndpointsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [current.apiKey, current.baseUrl, current.defaultModel]);

  const updateSettings = (patch: Partial<OpenRouterSettings>) => {
    onSettingsChange?.({ ...current, ...patch });
  };

  const selectModel = (model: OpenRouterModelSearchResult) => {
    updateSettings({ defaultModel: model.id, endpointTag: "" });
  };

  return (
    <SettingsCard title="OpenRouter">
      <p style={descriptionStyles}>
        Uses OpenRouter chat completions with an exact model slug.
      </p>
      <label style={fieldStyles}>
        <span style={labelStyles}>API key</span>
        <input
          autoComplete="off"
          onChange={(event) => updateSettings({ apiKey: event.target.value })}
          placeholder="sk-or-..."
          style={inputStyles}
          type="password"
          value={current.apiKey}
        />
      </label>
      <label style={fieldStyles}>
        <span style={labelStyles}>Base URL</span>
        <input
          onChange={(event) => updateSettings({ baseUrl: event.target.value })}
          placeholder="https://openrouter.ai/api/v1"
          style={inputStyles}
          type="text"
          value={current.baseUrl}
        />
      </label>
      <label style={fieldStyles}>
        <span style={labelStyles}>Model slug search</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="openai/gpt-5-nano"
          style={inputStyles}
          type="text"
          value={query}
        />
      </label>
      {current.defaultModel ? (
        <div style={{ ...rowBaseStyles, ...rowSelectedStyles, border: "none" }}>
          <div style={modelInfoStyles}>
            <div style={modelTitleStyles}>Selected model</div>
            <div style={modelDescriptionStyles}>{current.defaultModel}</div>
          </div>
        </div>
      ) : null}
      <div style={listStyles}>
        {modelsLoading ? <p style={mutedStyles}>Searching...</p> : null}
        {models.map((model) => (
          <button
            aria-pressed={model.id === current.defaultModel}
            key={model.id}
            onClick={() => selectModel(model)}
            style={{
              ...rowBaseStyles,
              border: "none",
              textAlign: "left",
              width: "100%",
              ...(model.id === current.defaultModel ? rowSelectedStyles : {}),
            }}
            type="button"
          >
            <div style={modelInfoStyles}>
              <div style={modelTitleStyles}>{model.name}</div>
              <div style={modelDescriptionStyles}>{model.id}</div>
            </div>
          </button>
        ))}
      </div>
      {current.defaultModel ? (
        <div style={fieldStyles}>
          <span style={labelStyles}>Endpoint</span>
          <div style={listStyles}>
            <button
              aria-pressed={!current.endpointTag}
              onClick={() => updateSettings({ endpointTag: "" })}
              style={{
                ...rowBaseStyles,
                border: "none",
                textAlign: "left",
                width: "100%",
                ...(current.endpointTag ? {} : rowSelectedStyles),
              }}
              type="button"
            >
              <div style={modelInfoStyles}>
                <div style={modelTitleStyles}>OpenRouter - automatic</div>
                <div style={modelDescriptionStyles}>default routing</div>
              </div>
            </button>
            {endpointsLoading ? (
              <p style={mutedStyles}>Loading endpoints...</p>
            ) : null}
            {endpoints.map((endpoint) => (
              <button
                aria-pressed={endpoint.tag === current.endpointTag}
                key={endpoint.tag}
                onClick={() => updateSettings({ endpointTag: endpoint.tag })}
                style={{
                  ...rowBaseStyles,
                  border: "none",
                  textAlign: "left",
                  width: "100%",
                  ...(endpoint.tag === current.endpointTag
                    ? rowSelectedStyles
                    : {}),
                }}
                type="button"
              >
                <div style={modelInfoStyles}>
                  <div style={modelTitleStyles}>{endpoint.label}</div>
                  <div style={modelDescriptionStyles}>{endpoint.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p style={noteStyles}>{error}</p> : null}
    </SettingsCard>
  );
};

export default OpenRouterSettingsCard;
