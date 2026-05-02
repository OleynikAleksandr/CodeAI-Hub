import type React from "react";
import { useEffect } from "react";

interface DetachedCaptureWorkbenchProps {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export const DetachedCaptureWorkbench: React.FC<
  DetachedCaptureWorkbenchProps
> = ({ workspacePath, workspaceSlug }) => {
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

      <section aria-label="Capture selection" style={styles.selectionBar}>
        <Selector label="Step" value="Description" />
        <Selector label="Provider" tone="claude" value="Claude" />
        <Selector label="Model" value="Sonnet" />
        <Selector label="Reasoning" value="thinking high" />
      </section>

      <main style={styles.main}>
        <section style={styles.snapshotRow}>
          <SnapshotPanel mode="Vanilla" state="disabled" />
          <SnapshotPanel mode="Managed" state="empty" />
        </section>
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

const Selector: React.FC<{
  readonly label: string;
  readonly tone?: "claude";
  readonly value: string;
}> = ({ label, tone, value }) => (
  <button
    data-provider={tone}
    style={{
      ...styles.selector,
      ...(tone === "claude" ? styles.selectorClaude : {}),
    }}
    type="button"
  >
    <span style={styles.selectorLabel}>{label}</span>
    <span style={styles.selectorValue}>{value}</span>
    <span style={styles.selectorCaret}>v</span>
  </button>
);

const SnapshotPanel: React.FC<{
  readonly mode: "Managed" | "Vanilla";
  readonly state: "disabled" | "empty";
}> = ({ mode, state }) => (
  <article style={styles.snapshotPanel}>
    <div style={styles.panelHeader}>
      <span style={styles.panelTitle}>{mode}</span>
      <span style={styles.mutedText}>
        {state === "disabled" ? "Deferred" : "No artifact"}
      </span>
    </div>
    <div style={styles.snapshotBody}>
      <div style={styles.snapshotSlot}>
        <span>Current</span>
        <span style={styles.mutedText}>empty</span>
      </div>
      <div style={styles.snapshotSlot}>
        <span>Previous</span>
        <span style={styles.mutedText}>empty</span>
      </div>
    </div>
  </article>
);

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
  selectionBar: {
    alignItems: "center",
    background: "#20232a",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    padding: "12px 16px",
  },
  selector: {
    alignItems: "center",
    background: "#2c313b",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    color: "#e6e8eb",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    minWidth: 0,
    padding: "7px 10px",
  },
  selectorClaude: {
    background: "rgba(230, 166, 116, 0.18)",
    borderColor: "rgba(230, 166, 116, 0.55)",
  },
  selectorLabel: {
    color: "#7e828a",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  selectorValue: { color: "#e6e8eb", fontSize: 13, fontWeight: 500 },
  selectorCaret: { color: "#7e828a", fontSize: 9 },
  main: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: 0,
    overflow: "hidden",
  },
  snapshotRow: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    padding: 16,
  },
  snapshotPanel: {
    background: "#20232a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    minHeight: 130,
  },
  panelHeader: {
    alignItems: "center",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
  },
  panelTitle: { fontSize: 12, fontWeight: 600 },
  mutedText: { color: "#7e828a", fontSize: 11 },
  snapshotBody: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    padding: 12,
  },
  snapshotSlot: {
    background: "#2c313b",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    display: "grid",
    gap: 8,
    minHeight: 72,
    padding: 10,
  },
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
