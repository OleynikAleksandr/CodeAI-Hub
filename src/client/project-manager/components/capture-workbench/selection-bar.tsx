import React, { useEffect } from "react";
import type { WorkbenchSelectionState } from "../../services/workbench-bridge-types";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";
import {
  CAPTURE_WORKBENCH_PROVIDER_DEFAULTS,
  CaptureWorkbenchModelReasoningSelectors,
} from "./model-reasoning-selectors";
import { CaptureWorkbenchProviderSelector } from "./provider-selector";
import { CaptureWorkbenchStepSelector } from "./step-selector";

const DEFAULT_SELECTION: WorkbenchSelectionState = {
  step: "description",
  provider: "codex",
  ...CAPTURE_WORKBENCH_PROVIDER_DEFAULTS.codex,
};

interface CaptureWorkbenchSelectionBarProps {
  readonly onSelectionChange?: (selection: WorkbenchSelectionState) => void;
  readonly selection: WorkbenchSelectionState;
  readonly stateClient: Pick<
    WorkbenchStateClientApi,
    "loadSelection" | "saveSelection"
  >;
}

export const CaptureWorkbenchSelectionBar: React.FC<
  CaptureWorkbenchSelectionBarProps
> = ({ onSelectionChange, selection, stateClient }) => {
  useEffect(() => {
    let cancelled = false;
    stateClient
      .loadSelection()
      .then((file) => {
        if (cancelled) {
          return;
        }
        const nextSelection = file?.selection ?? DEFAULT_SELECTION;
        onSelectionChange?.(nextSelection);
      })
      .catch(() => {
        if (!cancelled) {
          onSelectionChange?.(DEFAULT_SELECTION);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onSelectionChange, stateClient]);

  const updateSelection = (nextSelection: WorkbenchSelectionState): void => {
    onSelectionChange?.(nextSelection);
    void stateClient
      .saveSelection({
        version: 1,
        selection: nextSelection,
        updatedAt: new Date().toISOString(),
      })
      .catch(() => undefined);
  };

  const updateProvider = (provider: string): void => {
    const defaults =
      CAPTURE_WORKBENCH_PROVIDER_DEFAULTS[provider] ??
      CAPTURE_WORKBENCH_PROVIDER_DEFAULTS.codex;
    updateSelection({ ...selection, provider, ...defaults });
  };

  return (
    <section aria-label="Capture selection" style={styles.selectionBar}>
      <CaptureWorkbenchStepSelector
        onChange={(step) => updateSelection({ ...selection, step })}
        value={selection.step}
      />
      <CaptureWorkbenchProviderSelector
        onChange={updateProvider}
        value={selection.provider}
      />
      <CaptureWorkbenchModelReasoningSelectors
        model={selection.model}
        onModelChange={(model) => updateSelection({ ...selection, model })}
        onReasoningChange={(reasoning) =>
          updateSelection({ ...selection, reasoning })
        }
        provider={selection.provider}
        reasoning={selection.reasoning}
      />
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  selectionBar: {
    alignItems: "center",
    background: "#20232a",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: "12px 16px",
  },
};
