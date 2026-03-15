import type { CSSProperties } from "react";

export {
  modelBodyStyles,
  modelControlButtonActiveStyles as reasoningButtonActiveStyles,
  modelControlButtonHoverStyles as reasoningButtonHoverStyles,
  modelControlButtonStyles as reasoningButtonStyles,
  modelControlLabelStyles as reasoningLabelStyles,
  modelControlRowStyles as reasoningRowStyles,
  modelIdStyles,
} from "../shared-model-card-styles";

export const warningStyles: CSSProperties = {
  background: "#3a2a1f",
  border: "1px solid #9b6b3d",
  color: "#ffd7a3",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};
