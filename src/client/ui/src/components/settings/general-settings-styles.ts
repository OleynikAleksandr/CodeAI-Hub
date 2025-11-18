import type { CSSProperties } from "react";

export const sectionStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

export const descriptionStyles: CSSProperties = {
  fontSize: "13px",
  color: "#bbbbbb",
  lineHeight: 1.4,
  margin: 0,
};

export const buttonBaseStyles: CSSProperties = {
  alignSelf: "flex-start",
  border: "1px solid #3a3d41",
  color: "#ffffff",
  padding: "8px 16px",
  borderRadius: "4px",
  fontSize: "12px",
  transition: "background 120ms ease, transform 80ms ease",
  background: "#0e639c",
  cursor: "pointer",
};

export const buttonStateStyles: Record<string, CSSProperties> = {
  hover: { background: "#1290d8" },
  active: { background: "#094771", transform: "scale(0.98)" },
  pending: { background: "#3a3d41", cursor: "progress", opacity: 0.8 },
  success: { background: "#2d8a3a" },
};

export const statusStyles: CSSProperties = {
  fontSize: "12px",
  color: "#cccccc",
  margin: 0,
};
