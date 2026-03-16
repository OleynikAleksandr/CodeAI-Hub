import type React from "react";

export type DiagramSaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

const SAVE_STATUS_COPY: Record<DiagramSaveState, string> = {
  idle: "Layout not saved yet",
  saving: "Saving layout...",
  saved: "Layout saved",
  error: "Layout save failed",
  conflict: "Conflict requires review",
};

const SAVE_STATUS_COLOR: Record<DiagramSaveState, string> = {
  idle: "var(--pm-text-muted)",
  saving: "var(--pm-accent-strong)",
  saved: "var(--pm-success-text)",
  error: "var(--pm-danger-text)",
  conflict: "var(--pm-warning-text)",
};

export const SaveStatusIndicator: React.FC<{
  readonly detail?: string | null;
  readonly state: DiagramSaveState;
}> = ({ detail, state }) => (
  <div
    title={detail ?? SAVE_STATUS_COPY[state]}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      minHeight: 32,
      padding: "0 12px",
      borderRadius: 999,
      border: "1px solid var(--pm-border-color)",
      background: "rgba(255, 255, 255, 0.02)",
      color: SAVE_STATUS_COLOR[state],
      fontSize: 12,
      fontWeight: 600,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "currentColor",
      }}
    />
    <span>{SAVE_STATUS_COPY[state]}</span>
    {detail ? (
      <span style={{ color: "var(--pm-text-muted)", fontWeight: 500 }}>
        {detail}
      </span>
    ) : null}
  </div>
);
