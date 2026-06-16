import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { useLocalization } from "../../../ui/src/app-host/use-localization";
import { api } from "../../api";
import { useWorkspaceSettingsPayload } from "../../services/workspace-settings-payload-hook";
import { CaptureWorkbenchDomListboxSelector } from "../capture-workbench/dom-listbox-selector";
import type { BranchNodeKind, BranchNodeSelection } from "./main-area-utils";
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
  value === "glmOpenCode" ||
  value === "localModels";

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
  readonly operationKind?: BranchNodeSelection["operationKind"];
  readonly workflowPath: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}> = ({
  kind,
  label,
  workflowPath,
  workspacePath,
  workspaceSlug,
}) => {
  const { availableEngines } = useLocalization();
  const providers = api.getDescriptionProviders();
  const firstProvider =
    providers.find((provider) => provider.connected && isProviderStackId(provider.id)) ??
    null;
  const [selectedProviderId, setSelectedProviderId] =
    useState<ProviderStackId | null>(firstProvider?.id ?? null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedReasoning, setSelectedReasoning] = useState<string | null>(null);
  const settingsPayload = useWorkspaceSettingsPayload({
    workspacePath,
    workspaceSlug,
  });

  const modelOptions = useMemo(
    () =>
      selectedProviderId
        ? getStartCardModelOptions(selectedProviderId, availableEngines)
        : [],
    [availableEngines, selectedProviderId]
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
      settingsPayload,
      selectedProviderId,
      availableEngines
    );
    setSelectedModelId(selection.modelId);
    setSelectedReasoning(selection.reasoning);
  }, [availableEngines, selectedProviderId, settingsPayload]);

  useEffect(() => {
    if (
      reasoningOptions.length > 0 &&
      !reasoningOptions.some((option) => option.id === selectedReasoning)
    ) {
      setSelectedReasoning(reasoningOptions[0]?.id ?? null);
    }
  }, [reasoningOptions, selectedReasoning]);

  const startDisabled = !(
    selectedProviderId &&
    selectedModelId &&
    selectedReasoning
  );
  return (
    <div className="pm-details" style={{ padding: "24px 20px" }}>
      <strong style={{ display: "block", fontSize: 14, marginBottom: 16 }}>
        {resolveKindLabel(kind)}: {label}
      </strong>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ color: "var(--pm-text-muted)", fontSize: 13 }}>
          Draft artifacts are not created yet. Start this node to create only
          this node session and its draft artifacts.
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
