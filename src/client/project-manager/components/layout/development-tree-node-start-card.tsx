import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import type { BranchNodeKind } from "./main-area-utils";
import {
  getStartCardModelOptions,
  getStartCardReasoningOptions,
  resolveDefaultStartCardModelSelection,
} from "../shared/stage-start-model-selection";

const LABEL_STYLE: React.CSSProperties = {
  color: "var(--pm-text-muted)",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const SELECT_STYLE: React.CSSProperties = {
  background: "rgba(7, 11, 18, 0.94)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  color: "var(--pm-text)",
  fontSize: 13,
  minHeight: 36,
  padding: "7px 10px",
};

const isProviderStackId = (value: string): value is ProviderStackId =>
  value === "claudeCodeCli" || value === "codexCli" || value === "geminiCli";

const resolveKindLabel = (kind: BranchNodeKind): string =>
  kind === "product-part" ? "Product Part" : kind === "cluster" ? "Cluster" : "Module";

export const DevelopmentTreeNodeStartCard: React.FC<{
  readonly kind: BranchNodeKind;
  readonly label: string;
  readonly nodeId: string;
  readonly workflowPath: string;
}> = ({ kind, label, nodeId, workflowPath }) => {
  const providers = api.getDescriptionProviders();
  const firstProvider =
    providers.find((provider) => provider.connected && isProviderStackId(provider.id)) ??
    null;
  const [selectedProviderId, setSelectedProviderId] =
    useState<ProviderStackId | null>(firstProvider?.id ?? null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<string | null>(null);

  const modelOptions = useMemo(
    () =>
      selectedProviderId
        ? getStartCardModelOptions(selectedProviderId)
        : [],
    [selectedProviderId]
  );
  const reasoningOptions = useMemo(
    () =>
      selectedProviderId && selectedModelId
        ? getStartCardReasoningOptions(selectedProviderId, selectedModelId)
        : [],
    [selectedModelId, selectedProviderId]
  );

  useEffect(() => {
    if (!selectedProviderId) {
      setSelectedModelId(null);
      setSelectedReasoning(null);
      return;
    }
    const selection = resolveDefaultStartCardModelSelection(
      api.getLastSettingsPayload(),
      selectedProviderId
    );
    setSelectedModelId(selection.modelId);
    setSelectedReasoning(selection.reasoning);
  }, [selectedProviderId]);

  useEffect(() => {
    if (
      reasoningOptions.length > 0 &&
      !reasoningOptions.some((option) => option.id === selectedReasoning)
    ) {
      setSelectedReasoning(reasoningOptions[0]?.id ?? null);
    }
  }, [reasoningOptions, selectedReasoning]);

  const startDisabled = !(selectedProviderId && selectedModelId && selectedReasoning);
  return (
    <div className="pm-details" style={{ padding: "24px 20px" }}>
      <strong style={{ display: "block", fontSize: 14, marginBottom: 16 }}>
        {resolveKindLabel(kind)}: {label}
      </strong>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ color: "var(--pm-text-muted)", fontSize: 13 }}>
          Draft artifacts are not created yet. Start this node to create only this
          node session and its draft artifacts.
        </div>
        <div style={LABEL_STYLE}>Agent provider</div>
        <select
          onChange={(event) =>
            setSelectedProviderId(
              isProviderStackId(event.target.value) ? event.target.value : null
            )
          }
          style={SELECT_STYLE}
          value={selectedProviderId ?? ""}
        >
          {providers.map((provider) => (
            <option
              disabled={!provider.connected || !isProviderStackId(provider.id)}
              key={provider.id}
              value={provider.id}
            >
              {provider.title}
            </option>
          ))}
        </select>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL_STYLE}>Model</span>
            <select
              onChange={(event) => setSelectedModelId(event.target.value)}
              style={SELECT_STYLE}
              value={selectedModelId ?? ""}
            >
              {modelOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={LABEL_STYLE}>Reasoning</span>
            <select
              onChange={(event) => setSelectedReasoning(event.target.value)}
              style={SELECT_STYLE}
              value={selectedReasoning ?? ""}
            >
              {reasoningOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          className="pm-provider-picker__button pm-provider-picker__button--primary"
          disabled={startDisabled}
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("pm:development-tree-node:start", {
                detail: {
                  modelId: selectedModelId,
                  nodeId,
                  providerId: selectedProviderId,
                  reasoning: selectedReasoning,
                  workflowPath,
                },
              })
            );
          }}
          type="button"
        >
          Start node
        </button>
      </div>
    </div>
  );
};
