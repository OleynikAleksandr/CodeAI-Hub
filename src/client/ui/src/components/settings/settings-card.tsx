import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { settingsColorTokens, settingsRadiusTokens } from "./style-tokens";

const cardStyles: CSSProperties = {
  background: settingsColorTokens.surfaceElevated,
  borderRadius: settingsRadiusTokens.control,
  padding: "16px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const headerStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
};

const titleStyles: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  margin: 0,
  color: settingsColorTokens.textPrimary,
};

type SettingsCardProps = {
  readonly title?: string;
  readonly action?: ReactNode;
};

const SettingsCard = ({
  title,
  action,
  children,
}: PropsWithChildren<SettingsCardProps>) => (
  <div style={cardStyles}>
    {title ? (
      <div style={headerStyles}>
        <h3 style={titleStyles}>{title}</h3>
        {action}
      </div>
    ) : null}
    {children}
  </div>
);

export default SettingsCard;
