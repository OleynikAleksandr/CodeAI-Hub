import type { CSSProperties } from "react";

export const modelBodyStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flex: 1,
};

export const modelIdStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8c8c8c",
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
