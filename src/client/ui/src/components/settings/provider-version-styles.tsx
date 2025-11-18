import type { CSSProperties } from "react";

export const providerCardStyles: CSSProperties = {
  border: "1px solid #2d2d30",
  borderRadius: "8px",
  padding: "14px",
  background: "#161616",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

export const providerHeaderStyles: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
};

export const providerTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
};

export const providerStatusStyles: CSSProperties = {
  fontSize: "12px",
  color: "#cccccc",
  margin: 0,
};

export const versionSectionsStyles: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
};

export const versionSectionStyles: CSSProperties = {
  border: "1px solid #2a2a2d",
  borderRadius: "6px",
  padding: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  minHeight: "80px",
};

export const detailLabelStyles: CSSProperties = {
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#777",
  margin: 0,
};

export const detailValueStyles: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#dddddd",
  wordBreak: "break-all",
};

export const pathStyles: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  color: "#7b7b7b",
  wordBreak: "break-all",
};

export const buttonStyles: CSSProperties = {
  borderRadius: "4px",
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#ffffff",
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  alignSelf: "flex-start",
};

export const actionsContainerStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

export const actionButtonStyles: CSSProperties = {
  borderRadius: "4px",
  border: "1px solid #3a3d41",
  background: "#0e639c",
  color: "#ffffff",
  padding: "6px 14px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

export const dangerButtonStyles: CSSProperties = {
  ...actionButtonStyles,
  background: "#8c2020",
  borderColor: "#b22222",
};

export const operationStatusStyles: CSSProperties = {
  fontSize: "12px",
  color: "#cccccc",
  margin: 0,
};

export const operationErrorStyles: CSSProperties = {
  ...operationStatusStyles,
  color: "#ff7676",
};

export const riskWarningStyles: CSSProperties = {
  fontSize: "11px",
  color: "#ffcc66",
  margin: "0",
  lineHeight: 1.4,
};

export const badgeStyles: CSSProperties = {
  borderRadius: "12px",
  border: "1px solid #c4a000",
  padding: "2px 8px",
  fontSize: "11px",
  color: "#f1c232",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export const uncheckedBadgeStyles: CSSProperties = {
  ...badgeStyles,
  borderColor: "#d9534f",
  color: "#ffb3b0",
};
