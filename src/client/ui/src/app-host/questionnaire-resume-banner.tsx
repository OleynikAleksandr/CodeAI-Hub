import type { CSSProperties } from "react";

interface QuestionnaireResumeBannerProps {
  readonly note: string;
  readonly onResume: () => void;
  readonly resumeLabel: string;
}

const containerStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  margin: "12px 16px",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #2a2d33",
  background: "#1f2125",
  color: "#e5e5e5",
};

const buttonStyles: CSSProperties = {
  appearance: "none",
  border: "1px solid #0e639c",
  borderRadius: "8px",
  background: "#0e639c",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: 600,
  padding: "8px 12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const QuestionnaireResumeBanner = ({
  note,
  resumeLabel,
  onResume,
}: QuestionnaireResumeBannerProps) => (
  <div style={containerStyles}>
    <span>{note}</span>
    <button onClick={onResume} style={buttonStyles} type="button">
      {resumeLabel}
    </button>
  </div>
);
