import type { CSSProperties } from "react";
import { settingsColorTokens } from "./style-tokens";

export const descriptionStyles: CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textSecondary,
  fontSize: "12px",
  lineHeight: 1.5,
};

export const noteStyles: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  color: "#8f8f8f",
};

export const listStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

export const rowBaseStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: settingsColorTokens.surfaceElevated,
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
  outline: "none",
  boxShadow: "none",
};

export const rowSelectedStyles: CSSProperties = {
  borderColor: settingsColorTokens.actionPrimary,
  background: "#1f2a33",
};

export const rowHoverStyles: CSSProperties = {
  borderColor: "#4a4a4a",
};

export const rowButtonResetStyles: CSSProperties = {
  appearance: "none",
  outline: "none",
  textAlign: "left",
};

export const modelInfoStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export const modelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: settingsColorTokens.textPrimary,
};

export const aliasStyles: CSSProperties = {
  fontSize: "11px",
  color: "#9b9b9b",
};

export const modelDescriptionStyles: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#a7a7a7",
  lineHeight: 1.4,
};

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

export const modelControlRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingLeft: "28px",
};

export const modelControlLabelStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
};

export const modelControlButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  padding: "4px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
};

export const modelControlButtonHoverStyles: CSSProperties = {
  borderColor: "#5a5a5a",
  background: "#2b2f33",
  color: "#ffffff",
};

export const modelControlButtonActiveStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#0e639c",
  color: "#ffffff",
};

export const radioCircleStyles: CSSProperties = {
  width: "16px",
  height: "16px",
  minWidth: "16px",
  borderRadius: "50%",
  borderWidth: "2px",
  borderStyle: "solid",
  borderColor: "#5a5a5a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "3px",
  transition: "border-color 0.15s",
  outline: "none",
  boxShadow: "none",
};

export const radioCircleSelectedStyles: CSSProperties = {
  borderColor: settingsColorTokens.actionPrimary,
};

export const radioCircleInnerStyles: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: settingsColorTokens.actionPrimary,
};
