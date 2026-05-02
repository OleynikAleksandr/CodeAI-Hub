import React, { useState } from "react";
import type {
  CaptureWorkbenchDiffSection as CaptureWorkbenchDiffSectionModel,
  CaptureWorkbenchDiffStatus,
} from "./diff-section-model";

interface CaptureWorkbenchDiffSectionProps {
  readonly initiallyExpanded?: boolean;
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly section: CaptureWorkbenchDiffSectionModel;
}

const STATUS_COLORS: Record<CaptureWorkbenchDiffStatus, string> = {
  added: "#57c785",
  changed: "#d7b46a",
  equal: "#7e828a",
  removed: "#ff8a8a",
};

export const CaptureWorkbenchDiffSection: React.FC<
  CaptureWorkbenchDiffSectionProps
> = ({ initiallyExpanded, leftLabel, rightLabel, section }) => {
  const [expanded, setExpanded] = useState(
    initiallyExpanded ?? !section.collapsedByDefault
  );
  const statusColor = STATUS_COLORS[section.status];

  return (
    <article style={styles.section}>
      <button
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        style={styles.header}
        type="button"
      >
        <span style={{ ...styles.statusDot, background: statusColor }} />
        <span style={styles.title}>{section.definition.title}</span>
        <span style={{ ...styles.statusText, color: statusColor }}>
          {section.statusText}
        </span>
        <span aria-hidden={true} style={styles.expander}>
          {expanded ? "-" : "+"}
        </span>
      </button>
      {expanded ? (
        <div style={styles.body}>
          <DiffSide
            content={section.left.content}
            label={leftLabel}
            status={section.status === "removed" ? "removed" : null}
          />
          <DiffSide
            content={section.right.content}
            label={rightLabel}
            status={section.status === "added" ? "added" : null}
          />
        </div>
      ) : null}
    </article>
  );
};

const DiffSide: React.FC<{
  readonly content: string | null;
  readonly label: string;
  readonly status: "added" | "removed" | null;
}> = ({ content, label, status }) => (
  <div style={styles.side}>
    <div style={styles.sideHeader}>{label}</div>
    <pre
      style={{
        ...styles.pre,
        ...(status === "added" ? styles.addedBody : null),
        ...(status === "removed" ? styles.removedBody : null),
      }}
    >
      {content ?? "No section content"}
    </pre>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  addedBody: {
    borderLeft: "2px solid #57c785",
  },
  body: {
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    display: "grid",
    gap: 1,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  expander: {
    color: "#b0b3b8",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 14,
    justifySelf: "end",
  },
  header: {
    alignItems: "center",
    background: "transparent",
    border: 0,
    color: "#e6e8eb",
    cursor: "pointer",
    display: "grid",
    gap: 10,
    gridTemplateColumns: "10px minmax(0, 1fr) auto 18px",
    minHeight: 36,
    padding: "0 12px",
    textAlign: "left",
    width: "100%",
  },
  pre: {
    color: "#d8dbe0",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
    fontSize: 11,
    margin: 0,
    maxHeight: 220,
    overflow: "auto",
    padding: 12,
    whiteSpace: "pre-wrap",
  },
  removedBody: {
    borderLeft: "2px solid #ff8a8a",
  },
  section: {
    background: "#2c313b",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  side: {
    background: "#20232a",
    minWidth: 0,
  },
  sideHeader: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    color: "#7e828a",
    fontSize: 11,
    fontWeight: 600,
    padding: "7px 12px",
  },
  statusDot: {
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 600,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    minWidth: 0,
  },
};
