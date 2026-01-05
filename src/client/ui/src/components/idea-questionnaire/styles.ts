import type { CSSProperties } from "react";

export const questionnairePageStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  height: "100%",
  overflowY: "auto",
  padding: "20px",
  boxSizing: "border-box",
  background: "linear-gradient(180deg, #1b1d21 0%, #16181b 100%)",
  color: "#e5e5e5",
};

export const questionnaireHeaderStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export const questionnaireTitleStyles: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 600,
};

export const questionnaireDescriptionStyles: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#a7a7a7",
  lineHeight: 1.6,
};

export const questionnaireListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

export const questionnaireFooterStyles: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  paddingBottom: "16px",
};

export const questionnaireCancelButtonStyles: CSSProperties = {
  appearance: "none",
  border: "1px solid #3a3f46",
  borderRadius: "8px",
  background: "transparent",
  color: "#d5d7db",
  fontSize: "13px",
  fontWeight: 600,
  padding: "10px 16px",
  cursor: "pointer",
};

export const questionnaireSubmitButtonStyles: CSSProperties = {
  appearance: "none",
  border: "1px solid #0e639c",
  borderRadius: "8px",
  background: "#0e639c",
  color: "#ffffff",
  fontSize: "13px",
  fontWeight: 600,
  padding: "10px 16px",
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(14, 99, 156, 0.35)",
};

export const questionCardStyles: CSSProperties = {
  background: "#1f2125",
  border: "1px solid #2a2d33",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "0 8px 18px rgba(0, 0, 0, 0.25)",
};

export const questionHeaderStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export const questionTitleStyles: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#f0f0f0",
};

export const questionDescriptionStyles: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#9aa0a6",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
};

export const questionInputShellStyles: CSSProperties = {
  position: "relative",
  border: "1px solid #2c2f36",
  borderRadius: "8px",
  padding: "10px",
  background: "#16181b",
};

export const questionInputShellDraggingStyles: CSSProperties = {
  borderColor: "#2b88d8",
  background: "#1e2a35",
};

export const questionInputShellFocusedStyles: CSSProperties = {
  borderColor: "#0e639c",
  boxShadow: "0 0 0 2px rgba(14, 99, 156, 0.2)",
};

export const questionTextareaStyles: CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#e5e5e5",
  fontSize: "13px",
  lineHeight: 1.6,
  resize: "vertical",
  overflow: "hidden",
  padding: 0,
  margin: 0,
  boxSizing: "border-box",
};

export const questionOverlayStyles: CSSProperties = {
  position: "absolute",
  inset: "0",
  borderRadius: "8px",
  background: "rgba(14, 99, 156, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#e5f4ff",
  fontSize: "12px",
  letterSpacing: "0.2px",
  pointerEvents: "none",
};
