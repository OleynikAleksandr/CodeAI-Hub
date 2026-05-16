import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import { StageArtifactPendingLayout } from "../shared/stage-artifact-stage-panel";
import type {
  DiagramProjectionNode,
  DiagramProjection,
} from "./adapters/domain-model-to-projection.types";
import { DiagramEditorSection } from "./diagram-editor-section";
import { DiagramEditorShell } from "./diagram-editor-shell";
import type { DiagramLoaderStatus } from "./use-diagram-loader";

const FOREGROUND_PROGRESS_POLL_MS = 3_000;
const BACKGROUND_PROGRESS_POLL_MS = 30_000;

type DiagramProgressPollingMode = "foreground" | "background" | "hidden";

const resolveDiagramProgressPollingMode = (): DiagramProgressPollingMode => {
  if (typeof document === "undefined") {
    return "foreground";
  }
  if (document.visibilityState !== "visible") {
    return "hidden";
  }
  return document.hasFocus() ? "foreground" : "background";
};

const resolveDiagramStageId = (
  _artifactPath: string
): "diagram_modules" => "diagram_modules";

type DiagramModulesProgressBanner = {
  readonly substep: string;
  readonly plannedCount: number;
  readonly generatedCount: number;
  readonly currentPartId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readDiagramModulesProgress = (
  value: unknown
): DiagramModulesProgressBanner | null => {
  if (!isRecord(value)) {
    return null;
  }
  const substep =
    typeof value.substep === "string" && value.substep.trim().length > 0
      ? value.substep.trim()
      : null;
  const plannedCount =
    typeof value.plannedCount === "number" ? value.plannedCount : null;
  const generatedCount =
    typeof value.generatedCount === "number" ? value.generatedCount : null;
  if (!(substep && plannedCount !== null && generatedCount !== null)) {
    return null;
  }
  const currentPartId =
    typeof value.currentPartId === "string" && value.currentPartId.trim().length > 0
      ? value.currentPartId.trim()
      : undefined;
  return { substep, plannedCount, generatedCount, currentPartId };
};

const buildDiagramModulesProgressText = (
  progress: DiagramModulesProgressBanner
): string => {
  if (progress.substep === "index") {
    return "Runtime формирует index Product Part и готовит последовательность materialization.";
  }
  if (progress.substep === "generate_product_part") {
    return `Собрано ${progress.generatedCount} из ${progress.plannedCount} Product Part. Сейчас materialize-ится ${progress.currentPartId ?? "следующий part"}.`;
  }
  if (progress.substep === "blocked_ambiguity") {
    return "Последовательность остановлена на architectural ambiguity и ждёт уточнения пользователя.";
  }
  return `Готово ${progress.generatedCount} из ${progress.plannedCount} Product Part. Диаграмма ожидает общего review.`;
};

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
  readonly initialNodes?: readonly DiagramProjectionNode[];
  readonly introText: string;
  readonly onDismissConflicts: () => void;
  readonly onNodesChange?: (
    nodes: readonly DiagramProjectionNode[]
  ) => void | Promise<void>;
  readonly onStartFix: (params: FixStartParams) => Promise<void>;
  readonly pendingContent: React.ReactNode;
  readonly projection: DiagramProjection | null;
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
  introText,
  onDismissConflicts,
  onNodesChange,
  onStartFix,
  pendingContent,
  projection,
  status,
  title,
  workspacePath,
  workspaceSlug,
}) => {
  const stageId = resolveDiagramStageId(artifactPath);
  const [diagramModulesProgress, setDiagramModulesProgress] =
    useState<DiagramModulesProgressBanner | null>(null);

  useEffect(() => {
    if (stageId !== "diagram_modules") {
      setDiagramModulesProgress(null);
      return;
    }

    let cancelled = false;
    let timer = 0;
    let loadInFlight = false;
    let pendingImmediateLoad = false;
    let pollingMode = resolveDiagramProgressPollingMode();

    const resolveIntervalMs = (): number | null => {
      if (pollingMode === "hidden") {
        return null;
      }
      return pollingMode === "background"
        ? BACKGROUND_PROGRESS_POLL_MS
        : FOREGROUND_PROGRESS_POLL_MS;
    };

    const scheduleNextLoad = () => {
      window.clearTimeout(timer);
      timer = 0;
      const intervalMs = resolveIntervalMs();
      if (cancelled || intervalMs === null) {
        return;
      }
      timer = window.setTimeout(() => {
        void loadProgress();
      }, intervalMs);
    };

    const requestImmediateLoad = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (cancelled || resolveIntervalMs() === null) {
        return;
      }
      if (loadInFlight) {
        pendingImmediateLoad = true;
        return;
      }
      void loadProgress();
    };

    const loadProgress = async (): Promise<void> => {
      if (cancelled || resolveIntervalMs() === null) {
        return;
      }
      loadInFlight = true;
      try {
        const state = await api.getWorkflowState(workspaceSlug, workspacePath);
        if (cancelled) {
          return;
        }
        setDiagramModulesProgress(
          readDiagramModulesProgress(state?.diagramModulesProgress)
        );
      } finally {
        loadInFlight = false;
        if (cancelled) {
          return;
        }
        if (pendingImmediateLoad && resolveIntervalMs() !== null) {
          pendingImmediateLoad = false;
          void loadProgress();
          return;
        }
        pendingImmediateLoad = false;
        scheduleNextLoad();
      }
    };

    const handleActivityChange = () => {
      const nextMode = resolveDiagramProgressPollingMode();
      if (nextMode === pollingMode) {
        return;
      }
      pollingMode = nextMode;
      if (pollingMode === "foreground") {
        requestImmediateLoad();
        return;
      }
      pendingImmediateLoad = false;
      scheduleNextLoad();
    };

    if (resolveIntervalMs() !== null) {
      requestImmediateLoad();
    }
    window.addEventListener("focus", handleActivityChange);
    window.addEventListener("blur", handleActivityChange);
    document.addEventListener("visibilitychange", handleActivityChange);

    return () => {
      cancelled = true;
      pendingImmediateLoad = false;
      window.clearTimeout(timer);
      timer = 0;
      window.removeEventListener("focus", handleActivityChange);
      window.removeEventListener("blur", handleActivityChange);
      document.removeEventListener("visibilitychange", handleActivityChange);
    };
  }, [stageId, workspacePath, workspaceSlug]);

  const progressBanner =
    stageId === "diagram_modules" && diagramModulesProgress ? (
      <div
        style={{
          display: "grid",
          gap: 4,
          padding: "10px 12px",
          border: "1px solid var(--pm-border)",
          borderRadius: 10,
          background: "var(--pm-panel-bg)",
        }}
      >
        <strong style={{ fontSize: 12 }}>Product Part Progress</strong>
        <span style={{ fontSize: 12, color: "var(--pm-text-muted)" }}>
          {buildDiagramModulesProgressText(diagramModulesProgress)}
        </span>
      </div>
    ) : null;

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
            stage={resolveDiagramStageId(artifactPath)}
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
          minHeight: "100%",
          gridTemplateRows: "minmax(0, 1fr)",
        }}
      >
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
              initialNodes={initialNodes}
              onNodesChange={onNodesChange}
              projection={projection}
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
      {progressBanner}
      {pendingContent}
    </StageArtifactPendingLayout>
  );
};
