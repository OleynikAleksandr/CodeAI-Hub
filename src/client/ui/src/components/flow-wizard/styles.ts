import type { CSSProperties } from "react";

export const flowWizardContainerStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2f2f2f",
  borderRadius: "8px",
  padding: "12px",
  background: "#252526",
};

export const flowWizardHeadingStyles: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
};

export const flowWizardStagesRowStyles: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "10px",
};

export const flowStageButtonBaseStyles: CSSProperties = {
  appearance: "none",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2f2f2f",
  borderRadius: "8px",
  padding: "12px 10px",
  background: "#1e1e1e",
  color: "#e5e5e5",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minHeight: "72px",
  textAlign: "left",
  outline: "none",
  boxShadow: "none",
  transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
};

export const flowStageButtonActiveStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

export const flowStageButtonActiveHoverStyles: CSSProperties = {
  borderColor: "#2b88d8",
};

export const flowStageButtonHoverStyles: CSSProperties = {
  borderColor: "#4a4a4a",
  background: "#242424",
};

export const flowStageButtonDisabledStyles: CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
  color: "#b0b0b0",
};

export const flowStageTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};

export const flowStageSubtitleStyles: CSSProperties = {
  fontSize: "11px",
  color: "#a7a7a7",
  lineHeight: 1.4,
  margin: 0,
};
