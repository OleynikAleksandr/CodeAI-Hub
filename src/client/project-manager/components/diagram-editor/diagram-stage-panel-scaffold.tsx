import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { StageArtifactFixButton } from "../shared/stage-artifact-fix-button";
import { StageArtifactPendingLayout } from "../shared/stage-artifact-stage-panel";
import type {
  DiagramFlowNode,
  DiagramFlowProjection,
} from "./adapters/domain-model-to-react-flow.types";
import { DiagramEditorSection } from "./diagram-editor-section";
import { DiagramEditorShell } from "./diagram-editor-shell";
import type { DiagramLoaderStatus } from "./use-diagram-loader";

const resolveDiagramStageId = (
  artifactPath: string
): "diagram_modules" | "foundation_envelope" =>
  artifactPath.includes("/foundation_envelope/")
    ? "foundation_envelope"
    : "diagram_modules";

const buildDiagramRepairPrompt = (params: {
  readonly artifactFileName: string;
  readonly artifactPath: string;
  readonly error: string;
  readonly stageId: "diagram_modules" | "foundation_envelope";
}): string =>
  [
    `Исправь артефакт \`${params.artifactFileName}\` по пути \`${params.artifactPath}\`.`,
    "Нужно сохранить валидные пользовательские правки, если они есть.",
    "Устрани parse/validation ошибку и верни корректный canonical artifact для этого stage.",
    ...(params.stageId === "foundation_envelope"
      ? [
          "Сохрани явные `Application Root`, `Shared Zones`, `Product Parts`, `Integration Seams` и projection-friendly markdown structure.",
        ]
      : []),
    `Ошибка: ${params.error}`,
  ].join("\n");

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
  readonly initialNodes?: readonly DiagramFlowNode[];
  readonly introText: string;
  readonly onDismissConflicts: () => void;
  readonly onNodesChange?: (
    nodes: readonly DiagramFlowNode[]
  ) => void | Promise<void>;
  readonly onStartFix: (params: FixStartParams) => Promise<void>;
  readonly pendingContent: React.ReactNode;
  readonly projection: DiagramFlowProjection | null;
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
    const loadProgress = async (): Promise<void> => {
      const state = await api.getWorkflowState(workspaceSlug, workspacePath);
      if (cancelled) {
        return;
      }
      setDiagramModulesProgress(
        readDiagramModulesProgress(state?.diagramModulesProgress)
      );
    };

    void loadProgress();
    const timer = window.setInterval(() => {
      void loadProgress();
    }, 3_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
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
            repairPrompt={
              error
                ? buildDiagramRepairPrompt({
                    artifactFileName,
                    artifactPath,
                    error,
                    stageId,
                  })
                : null
            }
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
