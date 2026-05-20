import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import { CaptureWorkbenchDomListboxSelector } from "../capture-workbench/dom-listbox-selector";
import type { BranchNodeKind } from "./main-area-utils";
import {
  getStartCardModelOptions,
  getStartCardReasoningOptions,
  resolveDefaultStartCardModelSelection,
} from "../shared/stage-start-model-selection";

const isProviderStackId = (value: string): value is ProviderStackId =>
  value === "claudeCodeCli" ||
  value === "codexCli" ||
  value === "geminiCli" ||
  value === "kimiCode" ||
  value === "glmClaudeCode";

const resolveKindLabel = (kind: BranchNodeKind): string =>
  kind === "product-part"
    ? "Product Part"
    : kind === "cluster"
      ? "Cluster"
      : kind === "operation"
        ? "Operation"
        : "Module";

export const DevelopmentTreeNodeStartCard: React.FC<{
  readonly kind: BranchNodeKind;
  readonly label: string;
  readonly nodeId: string;
  readonly workflowPath: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = ({ kind, label, nodeId, workflowPath, workspacePath, workspaceSlug }) => {
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
        <CaptureWorkbenchDomListboxSelector
          label="Agent provider"
          onChange={(value) =>
            setSelectedProviderId(isProviderStackId(value) ? value : null)
          }
          options={providers.map((provider) => ({
            disabled: !provider.connected || !isProviderStackId(provider.id),
            label: provider.title,
            value: provider.id,
          }))}
          value={selectedProviderId ?? ""}
        />
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <CaptureWorkbenchDomListboxSelector
            label="Model"
            onChange={setSelectedModelId}
            options={modelOptions.map((option) => ({
              label: option.label,
              title: option.description,
              value: option.id,
            }))}
            value={selectedModelId ?? ""}
          />
          <CaptureWorkbenchDomListboxSelector
            label="Reasoning"
            onChange={setSelectedReasoning}
            options={reasoningOptions.map((option) => ({
              label: option.label,
              value: option.id,
            }))}
            value={selectedReasoning ?? ""}
          />
        </div>
        <button
          className="pm-provider-picker__button pm-provider-picker__button--primary"
          disabled={startDisabled}
          onClick={() => {
            api.startDevelopmentTreeNode({
              modelId: selectedModelId,
              providerId: selectedProviderId ?? "",
              reasoning: selectedReasoning,
              workflowPath,
              workspacePath,
              workspaceSlug,
            });
          }}
          type="button"
        >
          Start node
        </button>
      </div>
    </div>
  );
};
