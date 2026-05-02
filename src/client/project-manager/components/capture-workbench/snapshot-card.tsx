import React from "react";
import { openProjectManagerFileLink } from "../../services/project-manager-file-link-opener";
import type {
  SlotEntryRecord,
  WorkbenchCaptureMode,
} from "../../services/workbench-bridge-types";

interface CaptureWorkbenchSnapshotCardProps {
  readonly busy?: boolean;
  readonly current: SlotEntryRecord | null;
  readonly disabled?: boolean;
  readonly mode: WorkbenchCaptureMode;
  readonly onRecapture?: () => void;
  readonly previous: SlotEntryRecord | null;
}

const MODE_COPY: Record<
  WorkbenchCaptureMode,
  {
    readonly captureLabel: string;
    readonly color: string;
    readonly disabledTitle?: string;
    readonly tag: string;
    readonly title: string;
  }
> = {
  managed: {
    captureLabel: "Re-capture Managed",
    color: "#7cc7ff",
    tag: "workflow + applied turn config",
    title: "Managed snapshot",
  },
  vanilla: {
    captureLabel: "Re-capture Vanilla",
    color: "#d7b46a",
    disabledTitle: "Vanilla capture is deferred to parent Phase 4",
    tag: "SDK defaults - no overrides",
    title: "Vanilla snapshot",
  },
};

export const CaptureWorkbenchSnapshotCard: React.FC<
  CaptureWorkbenchSnapshotCardProps
> = ({ busy = false, current, disabled = false, mode, onRecapture, previous }) => {
  const copy = MODE_COPY[mode];
  const actionsDisabled = disabled || busy;
  const captureDisabled = actionsDisabled || !onRecapture;
  const disabledTitle = disabled ? copy.disabledTitle : undefined;

  return (
    <article
      aria-label={copy.title}
      data-mode={mode}
      style={{ ...styles.card, borderLeftColor: copy.color }}
      title={disabledTitle}
    >
      <div style={styles.info}>
        <div style={styles.titleRow}>
          <span style={{ ...styles.modeLabel, color: copy.color }}>
            {copy.title}
          </span>
          <span style={styles.tag}>{copy.tag}</span>
        </div>
        <div style={current ? styles.meta : styles.metaEmpty}>
          {current ? formatCurrentMeta(current) : "No current artifact"}
        </div>
        <PreviousSnapshotLine previous={previous} />
      </div>

      <div style={styles.actions}>
        <FileButton
          disabled={actionsDisabled || !current}
          label={`${mode}.md`}
          path={current?.markdownPath ?? null}
        />
        <FileButton
          disabled={actionsDisabled || !current}
          label={`${mode}.jsonl`}
          path={current?.jsonlPath ?? null}
        />
        <button
          disabled={captureDisabled}
          onClick={onRecapture}
          style={{
            ...styles.captureButton,
            borderColor: copy.color,
            color: copy.color,
            opacity: captureDisabled ? 0.55 : 1,
          }}
          title={captureDisabled ? disabledTitle : undefined}
          type="button"
        >
          {busy ? "Capturing..." : copy.captureLabel}
        </button>
      </div>
    </article>
  );
};

const PreviousSnapshotLine: React.FC<{
  readonly previous: SlotEntryRecord | null;
}> = ({ previous }) => {
  if (!previous) {
    return <div style={styles.metaEmpty}>previous: empty</div>;
  }
  return (
    <div style={styles.meta}>
      <span>{`previous: ${formatTimestamp(previous.capturedAt)} - ${formatRelease(previous.releaseVersion)}`}</span>
      <button
        onClick={() => openArtifact(previous.markdownPath)}
        style={styles.previousLink}
        type="button"
      >
        open prev
      </button>
    </div>
  );
};

const FileButton: React.FC<{
  readonly disabled: boolean;
  readonly label: string;
  readonly path: string | null;
}> = ({ disabled, label, path }) => (
  <button
    disabled={disabled}
    onClick={() => {
      if (path) {
        openArtifact(path);
      }
    }}
    style={{
      ...styles.fileButton,
      opacity: disabled ? 0.55 : 1,
    }}
    type="button"
  >
    {label}
  </button>
);

const openArtifact = (path: string): void => {
  openProjectManagerFileLink({
    column: null,
    filePath: path,
    href: path,
    line: null,
  });
};

const formatCurrentMeta = (record: SlotEntryRecord): string =>
  `captured ${formatTimestamp(record.capturedAt)} - ${formatRelease(record.releaseVersion)}`;

const formatTimestamp = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.includes("T")) {
    return trimmed;
  }
  return trimmed.slice(0, 16).replace("T", " ");
};

const formatRelease = (value: string): string =>
  value.trim().startsWith("v") ? value.trim() : `v${value.trim()}`;

const styles: Record<string, React.CSSProperties> = {
  actions: {
    alignItems: "center",
    display: "flex",
    gap: 6,
  },
  captureButton: {
    background: "rgba(124, 199, 255, 0.08)",
    border: "1px solid",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 14px",
  },
  card: {
    background: "#20232a",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderLeft: "3px solid",
    borderRadius: 6,
    display: "grid",
    gap: 12,
    gridTemplateColumns: "minmax(0, 1fr) auto",
    minHeight: 92,
    padding: "12px 14px",
  },
  fileButton: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    color: "#b0b3b8",
    cursor: "pointer",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
    padding: "5px 9px",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
  meta: {
    color: "#b0b3b8",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
  },
  metaEmpty: {
    color: "#7e828a",
    fontSize: 11,
    fontStyle: "italic",
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  previousLink: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: 6,
    color: "#b0b3b8",
    cursor: "pointer",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
    marginLeft: 6,
    padding: "2px 7px",
  },
  tag: {
    color: "#7e828a",
    fontSize: 11,
  },
  titleRow: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },
};
