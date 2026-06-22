import React, { useEffect, useMemo, useState } from "react";
import { extractClaudeDiffSections } from "./diff-section-extractor-claude";
import { extractCodexDiffSections } from "./diff-section-extractor-codex";
import { CAPTURE_WORKBENCH_DIFF_SECTIONS } from "./diff-section-model";
import { buildCaptureWorkbenchDiffSection } from "./diff-section-normalizer";
import { CaptureWorkbenchDiffSection } from "./diff-section";
import type {
  SlotEntryRecord,
  WorkbenchSlotRecord,
} from "../../services/workbench-bridge-types";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";

interface CaptureWorkbenchDiffRendererProps {
  readonly provider: string;
  readonly slot: WorkbenchSlotRecord | null;
  readonly stateClient: Pick<WorkbenchStateClientApi, "readArtifactRecords">;
}

type DiffMode = "managed-history" | "managed-vs-vanilla" | "vanilla-history";

type DiffLoadState =
  | { readonly status: "empty" }
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | {
      readonly currentRecords: readonly unknown[];
      readonly previousRecords: readonly unknown[];
      readonly status: "ready";
    };

export const CaptureWorkbenchDiffRenderer: React.FC<
  CaptureWorkbenchDiffRendererProps
> = ({ provider, slot, stateClient }) => {
  const [mode, setMode] = useState<DiffMode>("managed-history");
  const [loadState, setLoadState] = useState<DiffLoadState>({
    status: "empty",
  });
  const pair = resolveDiffPair(slot, mode);

  useEffect(() => {
    if (!(pair.right?.jsonlPath && pair.left?.jsonlPath)) {
      setLoadState({ status: "empty" });
      return;
    }
    let cancelled = false;
    setLoadState({ status: "loading" });
    Promise.all([
      stateClient.readArtifactRecords(pair.left.jsonlPath),
      stateClient.readArtifactRecords(pair.right.jsonlPath),
    ])
      .then(([previousRecords, currentRecords]) => {
        if (!cancelled) {
          setLoadState({
            currentRecords,
            previousRecords,
            status: "ready",
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            message:
              error instanceof Error
                ? error.message
                : "Failed to load capture artifacts.",
            status: "error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pair.left?.jsonlPath, pair.right?.jsonlPath, stateClient]);

  const sections = useMemo(() => {
    if (loadState.status !== "ready") {
      return [];
    }
    const extract = provider === "codex" ? extractCodexDiffSections : extractClaudeDiffSections;
    const previousSections = extract(loadState.previousRecords);
    const currentSections = extract(loadState.currentRecords);
    return CAPTURE_WORKBENCH_DIFF_SECTIONS.map((definition) =>
      buildCaptureWorkbenchDiffSection({
        id: definition.id,
        left: previousSections[definition.id],
        right: currentSections[definition.id],
      })
    ).filter((section) => section !== null);
  }, [loadState, provider]);

  return (
    <section aria-label="Capture diff" style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.tabs} role="tablist">
          <ModeTab
            active={mode === "managed-vs-vanilla"}
            disabled={!canCompareManagedVanilla(slot)}
            label="Managed vs Vanilla"
            onClick={() => setMode("managed-vs-vanilla")}
          />
          <ModeTab
            active={mode === "managed-history"}
            label="Managed: current vs previous"
            onClick={() => setMode("managed-history")}
          />
          <ModeTab disabled={true} label="Vanilla: current vs previous" />
        </div>
        <span style={styles.summary}>{buildSummary(loadState, sections.length)}</span>
      </div>
      <div style={styles.sideLabels}>
        <span style={styles.sidePill}>{formatSnapshotLabel(pair.leftLabel, pair.left)}</span>
        <span style={styles.sidePill}>{formatSnapshotLabel(pair.rightLabel, pair.right)}</span>
      </div>
      <div style={styles.body}>
        {loadState.status === "ready" && sections.length > 0 ? (
          sections.map((section) => (
            <CaptureWorkbenchDiffSection
              key={section.definition.id}
              leftLabel={pair.leftLabel}
              rightLabel={pair.rightLabel}
              section={section}
            />
          ))
        ) : (
          <div style={styles.emptyState}>{buildEmptyState(loadState, mode)}</div>
        )}
      </div>
    </section>
  );
};

const ModeTab: React.FC<{
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onClick?: () => void;
}> = ({ active = false, disabled = false, label, onClick }) => (
  <button
    aria-selected={active}
    disabled={disabled}
    onClick={onClick}
    role="tab"
    style={{
      ...styles.tab,
      ...(active ? styles.activeTab : null),
      opacity: disabled ? 0.55 : 1,
    }}
    type="button"
  >
    {label}
  </button>
);

const buildSummary = (state: DiffLoadState, sectionCount: number): string => {
  switch (state.status) {
    case "empty":
      return "No capture pair selected";
    case "loading":
      return "Loading artifacts";
    case "error":
      return "Artifact load failed";
    case "ready":
      return `${sectionCount} sections`;
  }
};

const buildEmptyState = (state: DiffLoadState, mode: DiffMode): string => {
  switch (state.status) {
    case "empty":
      return mode === "managed-vs-vanilla"
        ? "Capture Managed and Vanilla snapshots to compare."
        : "Capture two Managed snapshots to compare current vs previous.";
    case "loading":
      return "Loading captured JSONL artifacts...";
    case "error":
      return state.message;
    case "ready":
      return "No diff sections available for this provider.";
  }
};

const canCompareManagedVanilla = (slot: WorkbenchSlotRecord | null): boolean =>
  Boolean(slot?.managed.current?.jsonlPath && slot.vanilla.current?.jsonlPath);

const resolveDiffPair = (
  slot: WorkbenchSlotRecord | null,
  mode: DiffMode
): {
  readonly left: SlotEntryRecord | null;
  readonly leftLabel: string;
  readonly right: SlotEntryRecord | null;
  readonly rightLabel: string;
} => {
  if (mode === "managed-vs-vanilla") {
    return {
      left: slot?.vanilla.current ?? null,
      leftLabel: "Vanilla",
      right: slot?.managed.current ?? null,
      rightLabel: "Managed",
    };
  }
  return {
    left: slot?.managed.previous ?? null,
    leftLabel: "Previous",
    right: slot?.managed.current ?? null,
    rightLabel: "Current",
  };
};

const formatSnapshotLabel = (
  label: string,
  record: SlotEntryRecord | null
): string =>
  record
    ? `${label} - ${formatTimestamp(record.capturedAt)} - ${formatRelease(record.releaseVersion)}`
    : `${label} - empty`;

const formatTimestamp = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.includes("T") ? trimmed.slice(0, 16).replace("T", " ") : trimmed;
};

const formatRelease = (value: string): string =>
  value.trim().startsWith("v") ? value.trim() : `v${value.trim()}`;

const styles: Record<string, React.CSSProperties> = {
  activeTab: {
    background: "#2c313b",
    color: "#e6e8eb",
  },
  body: {
    display: "grid",
    gap: 6,
    minHeight: 0,
    overflow: "auto",
    padding: 16,
  },
  container: {
    background: "#20232a",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    display: "grid",
    gridTemplateRows: "auto auto 1fr",
    minHeight: 0,
    overflow: "hidden",
  },
  emptyState: {
    alignItems: "center",
    color: "#7e828a",
    display: "flex",
    fontSize: 12,
    minHeight: 140,
  },
  sideLabels: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    padding: "8px 16px",
  },
  sidePill: {
    color: "#b0b3b8",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
  },
  summary: {
    color: "#7e828a",
    fontSize: 11,
  },
  tab: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    color: "#7e828a",
    cursor: "pointer",
    fontSize: 11,
    padding: "6px 10px",
  },
  tabs: {
    display: "flex",
    gap: 6,
  },
  toolbar: {
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 16px",
  },
};
