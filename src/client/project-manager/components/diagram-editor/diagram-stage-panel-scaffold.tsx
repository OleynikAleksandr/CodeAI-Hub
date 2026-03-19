import type React from "react";
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import { StageArtifactPendingLayout } from "../shared/stage-artifact-stage-panel";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { DiagramEditorSection } from "./diagram-editor-section";
import { DiagramEditorShell } from "./diagram-editor-shell";
import type { DiagramLayoutProfileId } from "./diagram-layout-facade";
import type { DiagramSaveState } from "./save-status-indicator";
import type { DiagramLoaderStatus } from "./use-diagram-loader";

type FixStartParams = {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly providerId: string;
};

type DiagramStagePanelScaffoldProps = {
  readonly artifactFileName: string;
  readonly artifactPath: string;
  readonly children: React.ReactNode;
  readonly conflicts: readonly string[];
  readonly content: string | null;
  readonly error: string | null;
  readonly initialNodes?: readonly DiagramFlowNode[];
  readonly initialLayoutProfile?: DiagramLayoutProfileId;
  readonly introText: string;
  readonly onDismissConflicts: () => void;
  readonly onNodesChange?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
  readonly onFlowStateChange?: (payload: {
    readonly nodes: readonly DiagramFlowNode[];
    readonly revision: string;
    readonly layoutProfile?: DiagramLayoutProfileId;
  }) => void | Promise<void>;
  readonly onStartFix: (params: FixStartParams) => Promise<void>;
  readonly pendingContent: React.ReactNode;
  readonly projection: DiagramFlowProjection | null;
  readonly saveState: DiagramSaveState;
  readonly status: DiagramLoaderStatus;
  readonly title: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
};

export const DiagramStagePanelScaffold: React.FC<DiagramStagePanelScaffoldProps> = ({
  artifactFileName,
  artifactPath,
  children,
  conflicts,
  content,
  error,
  initialNodes,
  initialLayoutProfile,
  introText,
  onDismissConflicts,
  onNodesChange,
  onFlowStateChange,
  onStartFix,
  pendingContent,
  projection,
  saveState,
  status,
  title,
  workspacePath,
  workspaceSlug,
}) => {
  if (status === "loading") {
    return <div className="pm-placeholder">Загружаем {title}…</div>;
  }

  if (status === "error") {
    return (
      <div className="pm-details">
        <div style={{ display: "grid", gap: 12 }}>
          <div className="pm-placeholder">{error ?? `Не удалось загрузить ${title}.`}</div>
          <StageArtifactFixButton
            onStart={onStartFix}
            workspacePath={workspacePath}
            workspaceSlug={workspaceSlug}
          />
          {content ? (
            <div style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
              Артефакт загружен, но не прошёл parse/validation check:
              <code style={{ marginLeft: 6 }}>{artifactFileName}</code>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === "ready" && projection) {
    return (
      <div
        className="pm-details"
        style={{
          display: "grid",
          gap: 12,
          minHeight: "100%",
          gridTemplateRows: "auto minmax(0, 1fr)",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <strong>{title}</strong>
          <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
            {introText}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
          }}
        >
          <div style={{ display: "flex", flex: "1 1 auto", minHeight: 0 }}>
            <DiagramEditorShell
              initialLayoutProfile={initialLayoutProfile}
              initialNodes={initialNodes}
              onFlowStateChange={onFlowStateChange}
              onNodesChange={onNodesChange}
              projection={projection}
              saveState={saveState}
              title={title}
            />
          </div>
          {conflicts.length > 0 ? (
            <DiagramEditorSection defaultOpen title="Conflict merge warnings">
              <div className="pm-placeholder" style={{ display: "grid", gap: 6 }}>
                {conflicts.map((message) => (
                  <div key={message}>{message}</div>
                ))}
                <button type="button" onClick={onDismissConflicts}>
                  Dismiss warnings
                </button>
              </div>
            </DiagramEditorSection>
          ) : null}
          {children}
        </div>
      </div>
    );
  }

  return (
    <StageArtifactPendingLayout artifactPath={artifactPath} title={title}>
      {pendingContent}
    </StageArtifactPendingLayout>
  );
};
