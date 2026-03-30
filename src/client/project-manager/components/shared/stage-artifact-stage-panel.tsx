import type React from "react";

export const StageArtifactPendingLayout: React.FC<{
  readonly title: string;
  readonly artifactPath: string;
  readonly children: React.ReactNode;
}> = (props) => (
  <div className="pm-details">
    <div style={{ marginBottom: 12 }}>
      <strong>{props.title}</strong>
    </div>
    <div className="pm-placeholder" style={{ marginBottom: 12 }}>
      Ожидаем артефакт: <code>{props.artifactPath}</code>
    </div>
    <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
  </div>
);
