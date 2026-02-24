import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import { IdeaCollectorSubmitService } from "../../services/idea-collector-submit-service";
import MarkdownContent from "../../../ui/src/session/markdown-content";

const RESTART_ARM_TIMEOUT_MS = 4_000;

export const WorkflowArtifactViewer: React.FC<{
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
  readonly refreshKey?: number;
  readonly onClose: () => void;
}> = (props) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restartArmed, setRestartArmed] = useState(false);
  const [restartInFlight, setRestartInFlight] = useState(false);
  const submitServiceRef = useRef(new IdeaCollectorSubmitService());
  const restartArmTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    const httpUrl = api.getHttpUrl();
    if (!httpUrl) {
      setError("Не удалось загрузить артефакт: Core HTTP недоступен.");
      return () => {
        cancelled = true;
      };
    }
    const query = new URLSearchParams({
      workspacePath: props.workspacePath,
      workspaceSlug: props.workspaceSlug,
      path: props.path,
      maxBytes: "300000",
    });
    fetch(`${httpUrl}/api/v1/orchestrator/workflow-artifact?${query.toString()}`, {
      method: "GET",
    })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setError("Не удалось загрузить артефакт (endpoint недоступен или файл не найден).");
          return;
        }
        const payload = (await response.json()) as unknown;
        if (!payload || typeof payload !== "object") {
          setError("Не удалось загрузить артефакт: неверный ответ сервера.");
          return;
        }
        const record = payload as Record<string, unknown>;
        const nextContent = typeof record.content === "string" ? record.content : null;
        if (nextContent === null) {
          setError("Не удалось загрузить артефакт: контент отсутствует.");
          return;
        }
        setContent(nextContent);
      })
      .catch((readError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(readError instanceof Error ? readError.message : String(readError));
      });
    return () => {
      cancelled = true;
    };
  }, [props.path, props.refreshKey, props.workspacePath, props.workspaceSlug]);

  useEffect(
    () => () => {
      if (restartArmTimerRef.current !== null) {
        window.clearTimeout(restartArmTimerRef.current);
      }
    },
    []
  );

  const showBackButton =
    props.label !== "description.md" &&
    props.label !== "Final_Description.md" &&
    props.label !== "questionnaire.md";

  const canRestartAttempt = props.label === "questionnaire.md";

  const handleRestartAttempt = async (): Promise<void> => {
    if (!canRestartAttempt || restartInFlight) {
      return;
    }
    setRestartError(null);

    setRestartInFlight(true);
    try {
      const state = await api.getWorkflowState(
        props.workspaceSlug,
        props.workspacePath
      );
      const providerId =
        state?.description?.collectorSession?.providerId ??
        state?.description?.session?.providerId ??
        api.getIdeaCollectorProviders().at(0)?.id ??
        null;

      if (!providerId) {
        setRestartError("Не удалось определить провайдера для перезапуска.");
        return;
      }

      await submitServiceRef.current.submitQuestionnaire({
        workspacePath: props.workspacePath,
        workspaceSlug: props.workspaceSlug,
        questionnairePath: props.path,
        stage: "description",
        providerId: providerId as ProviderStackId,
      });
    } catch (submitError: unknown) {
      setRestartError(
        submitError instanceof Error ? submitError.message : String(submitError)
      );
    } finally {
      setRestartInFlight(false);
    }
  };

  const handleRestartClick = () => {
    if (!canRestartAttempt || restartInFlight) {
      return;
    }
    if (!restartArmed) {
      setRestartArmed(true);
      if (restartArmTimerRef.current !== null) {
        window.clearTimeout(restartArmTimerRef.current);
      }
      restartArmTimerRef.current = window.setTimeout(() => {
        restartArmTimerRef.current = null;
        setRestartArmed(false);
      }, RESTART_ARM_TIMEOUT_MS);
      return;
    }
    setRestartArmed(false);
    if (restartArmTimerRef.current !== null) {
      window.clearTimeout(restartArmTimerRef.current);
      restartArmTimerRef.current = null;
    }
    void handleRestartAttempt();
  };

  return (
    <div className="pm-details">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        {showBackButton ? (
          <button onClick={props.onClose} type="button">
            Back
          </button>
        ) : null}
        <strong title={props.path}>{props.label}</strong>
        {canRestartAttempt ? (
          <button
            aria-label={restartArmed ? "Confirm restart attempt" : "Restart attempt"}
            disabled={restartInFlight}
            onClick={handleRestartClick}
            style={{
              width: 36,
              height: 32,
              padding: 0,
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.18)",
              background: restartInFlight
                ? "rgba(255,255,255,0.06)"
                : restartArmed
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.92)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: restartInFlight ? "not-allowed" : "pointer",
            }}
            title={
              restartInFlight
                ? "↻ Restarting..."
                : restartArmed
                  ? "↻ Confirm restart (click again)"
                  : "↻ Restart attempt"
            }
            type="button"
          >
            ↻
          </button>
        ) : null}
      </div>
      {restartError ? <div className="pm-placeholder">{restartError}</div> : null}
      {error ? <div className="pm-placeholder">{error}</div> : null}
      {!error && content === null ? (
        <div className="pm-placeholder">Загружаем артефакт...</div>
      ) : null}
      {!error && content !== null ? (
        <MarkdownContent className="pm-artifact-markdown" content={content} />
      ) : null}
    </div>
  );
};
