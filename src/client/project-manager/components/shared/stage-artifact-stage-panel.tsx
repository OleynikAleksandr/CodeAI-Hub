import type React from "react";
import { StageArtifactContentView } from "./stage-artifact-content-view";
import type { StageArtifactLoadStatus } from "./use-stage-artifact-loader";

type FixStartParams = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: string;
};

export const StageArtifactStateView: React.FC<{
  readonly status: StageArtifactLoadStatus;
  readonly content: string | null;
  readonly error: string | null;
  readonly errorFallback: string;
  readonly artifactPath: string;
  readonly displayFileName: string;
  readonly validationError: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly onFixStart: (params: FixStartParams) => Promise<void>;
}> = (props) => {
  if (props.status === "ready" && props.content !== null) {
    return (
      <StageArtifactContentView
        artifactPath={props.artifactPath}
        content={props.content}
        displayFileName={props.displayFileName}
        onFixStart={props.onFixStart}
        validationError={props.validationError}
        workspacePath={props.workspacePath}
        workspaceSlug={props.workspaceSlug}
      />
    );
  }

  if (props.status === "error") {
    return (
      <div className="pm-placeholder">{props.error ?? props.errorFallback}</div>
    );
  }

  return null;
};

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
