import type { CSSProperties } from "react";

export const descriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b0b0b0",
  margin: 0,
  lineHeight: 1.5,
};

export const warningStyles: CSSProperties = {
  background: "#3a2a1f",
  border: "1px solid #9b6b3d",
  color: "#ffd7a3",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};

export const modelListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

export const modelRowStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  border: "1px solid #2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: "#252526",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
};

export const modelRowSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

export const modelRowHoverStyles: CSSProperties = {
  borderColor: "#4a4a4a",
};

export const radioCircleStyles: CSSProperties = {
  width: "16px",
  height: "16px",
  minWidth: "16px",
  borderRadius: "50%",
  border: "2px solid #5a5a5a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "3px",
  transition: "border-color 0.15s",
};

export const radioCircleSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
};

export const radioCircleInnerStyles: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#0e639c",
};

export const modelInfoStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  flex: 1,
};

export const modelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
};

export const modelIdStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8c8c8c",
};

export const modelDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#a8a8a8",
  margin: "4px 0 0",
  lineHeight: 1.4,
};

export const modelBodyStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flex: 1,
};

export const reasoningRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingLeft: "28px",
};

export const reasoningLabelStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
};

export const reasoningButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  padding: "4px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
};

export const reasoningButtonHoverStyles: CSSProperties = {
  borderColor: "#5a5a5a",
  background: "#2b2f33",
  color: "#ffffff",
};

export const reasoningButtonActiveStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#0e639c",
  color: "#ffffff",
};

export const noteStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
  margin: 0,
};
