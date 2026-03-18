import type React from "react";

export const DiagramEditorSection: React.FC<{
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly description?: string;
  readonly title: string;
}> = ({ children, defaultOpen = false, description, title }) => (
  <details
    open={defaultOpen}
    style={{
      border: "1px solid var(--pm-border-color)",
      borderRadius: 12,
      background: "rgba(255, 255, 255, 0.02)",
      overflow: "hidden",
    }}
  >
    <summary
      style={{
        cursor: "pointer",
        padding: "12px 14px",
        fontWeight: 600,
      }}
    >
      {title}
      {description ? (
        <div
          style={{
            fontWeight: 400,
            fontSize: 12,
            color: "var(--pm-text-muted)",
            marginTop: 4,
          }}
        >
          {description}
        </div>
      ) : null}
    </summary>
    <div style={{ display: "grid", gap: 12, padding: "0 14px 14px" }}>
      {children}
    </div>
  </details>
);
