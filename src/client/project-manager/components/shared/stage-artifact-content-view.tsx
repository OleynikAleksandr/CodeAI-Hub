import type React from "react";
import MarkdownContent from "../../../ui/src/session/markdown-content";
import { StageArtifactFixButton } from "./stage-artifact-fix-button";

/**
 * Shared content renderer for "ready" state of stage artifact panels.
 * Handles both valid content and validation-error content with "Fix with agent" button.
 */
export const StageArtifactContentView: React.FC<{
  readonly artifactPath: string;
  readonly displayFileName: string;
  readonly content: string;
  readonly validationError: string | null;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly onFixStart: (params: {
    readonly workspacePath: string;
    readonly workspaceSlug: string;
    readonly providerId: string;
  }) => Promise<void>;
}> = (props) => {
  if (props.validationError) {
    return (
      <div className="pm-details">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <strong title={props.artifactPath}>{props.displayFileName}</strong>
        </div>
        <div className="pm-placeholder" style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <strong>ERROR:</strong> {props.validationError}
          </div>
          <StageArtifactFixButton
            onStart={props.onFixStart}
            workspacePath={props.workspacePath}
            workspaceSlug={props.workspaceSlug}
          />
        </div>
        <MarkdownContent className="pm-artifact-markdown" content={props.content} />
      </div>
    );
  }

  return (
    <div className="pm-details">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <strong title={props.artifactPath}>{props.displayFileName}</strong>
      </div>
      <MarkdownContent className="pm-artifact-markdown" content={props.content} />
    </div>
  );
};
