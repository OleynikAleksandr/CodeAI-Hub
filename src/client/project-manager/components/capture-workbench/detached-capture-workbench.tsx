import React, { useEffect, useState } from "react";
import type { CaptureWorkbenchRunnerTransport } from "../../services/capture-workbench-runner";
import type { WorkbenchSelectionState } from "../../services/workbench-bridge-types";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";
import { CaptureWorkbenchSelectionBar } from "./selection-bar";
import { CaptureWorkbenchSnapshotCardsRow } from "./snapshot-cards-row";

interface DetachedCaptureWorkbenchProps {
  readonly captureTransport?: CaptureWorkbenchRunnerTransport;
  readonly stateClient?: WorkbenchStateClientApi;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export const DetachedCaptureWorkbench: React.FC<
  DetachedCaptureWorkbenchProps
> = ({ captureTransport, stateClient, workspacePath, workspaceSlug }) => {
  const workbenchClient = stateClient ?? EMPTY_WORKBENCH_CLIENT;
  const workbenchTransport = captureTransport ?? EMPTY_CAPTURE_TRANSPORT;
  const [selection, setSelection] =
    useState<WorkbenchSelectionState>(DEFAULT_SELECTION);

  useEffect(() => {
    document.title = `Capture Workbench - ${workspaceSlug}`;
  }, [workspaceSlug]);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.headerTitle}>
          <span>Capture Workbench</span>
          <span style={styles.workspaceLabel}>{workspaceSlug}</span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.headerButton} type="button">
            Refresh
          </button>
          <button style={styles.headerButton} type="button">
            Close
          </button>
        </div>
      </header>

      <CaptureWorkbenchSelectionBar
        onSelectionChange={setSelection}
        stateClient={workbenchClient}
      />

      <main style={styles.main}>
        <CaptureWorkbenchSnapshotCardsRow
          captureTransport={workbenchTransport}
          context={{
            workspacePath,
            workspaceSlug,
          }}
          selection={selection}
          stateClient={workbenchClient}
        />
        <section style={styles.diffPanel}>
          <div style={styles.diffHeader}>
            <span style={styles.panelTitle}>Managed: current vs previous</span>
            <span style={styles.mutedText}>No capture selected</span>
          </div>
          <div style={styles.diffTable}>
            <DiffRow label="System Prompt" status="equal" />
            <DiffRow label="Tools" status="equal" />
            <DiffRow label="User Prompt" status="equal" />
            <DiffRow label="Applied Input Envelope" status="equal" />
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <span>{workspacePath}</span>
        <span>Ready</span>
      </footer>
    </div>
  );
};

const DEFAULT_SELECTION: WorkbenchSelectionState = {
  step: "description",
  provider: "claude",
  model: "sonnet",
  reasoning: "thinking-high",
};

const EMPTY_WORKBENCH_CLIENT: WorkbenchStateClientApi = {
  loadIndex: async () => null,
  loadSelection: async () => null,
  readArtifactRecords: async () => [],
  saveIndex: async () => undefined,
  saveSelection: async () => undefined,
};

const EMPTY_CAPTURE_TRANSPORT: CaptureWorkbenchRunnerTransport = {
  captureNativeRequest: () => undefined,
  getLastSettingsPayload: () => null,
  getWorkflowState: async () => null,
  onCoreEvent: () => () => undefined,
};

const DiffRow: React.FC<{
  readonly label: string;
  readonly status: "equal";
}> = ({ label, status }) => (
  <div style={styles.diffRow}>
    <span style={styles.diffMarker} />
    <span>{label}</span>
    <span style={styles.mutedText}>{status}</span>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  root: {
    background: "#181a1d",
    color: "#e6e8eb",
    display: "grid",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
    gridTemplateRows: "auto auto 1fr auto",
    height: "100vh",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    background: "#20232a",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "grid",
    gap: 16,
    gridTemplateColumns: "1fr auto",
    padding: "8px 16px",
  },
  headerTitle: {
    alignItems: "baseline",
    display: "flex",
    fontWeight: 600,
    gap: 12,
  },
  workspaceLabel: {
    color: "#7e828a",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
    fontWeight: 400,
  },
  headerActions: { display: "flex", gap: 6 },
  headerButton: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    color: "#b0b3b8",
    cursor: "pointer",
    fontSize: 11,
    padding: "5px 10px",
  },
  main: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: 0,
    overflow: "hidden",
  },
  panelTitle: { fontSize: 12, fontWeight: 600 },
  mutedText: { color: "#7e828a", fontSize: 11 },
  diffPanel: {
    background: "#20232a",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    minHeight: 0,
    overflow: "hidden",
  },
  diffHeader: {
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 16px",
  },
  diffTable: { display: "grid", gap: 1, padding: 16 },
  diffRow: {
    alignItems: "center",
    background: "#2c313b",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "10px 1fr auto",
    minHeight: 34,
    padding: "0 12px",
  },
  diffMarker: {
    background: "#444851",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  footer: {
    alignItems: "center",
    background: "#20232a",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#7e828a",
    display: "flex",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
    justifyContent: "space-between",
    padding: "7px 16px",
  },
};
