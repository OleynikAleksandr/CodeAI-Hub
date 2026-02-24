import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import MarkdownContent from "../../../ui/src/session/markdown-content";
import { QuestionnaireRestartAttemptControl } from "./questionnaire-restart-attempt-control";

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

  const showBackButton =
    props.label !== "description.md" &&
    props.label !== "Final_Description.md" &&
    props.label !== "questionnaire.md";

  const canRestartAttempt = props.label === "questionnaire.md";

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
          <QuestionnaireRestartAttemptControl
            onError={setRestartError}
            questionnairePath={props.path}
            workspacePath={props.workspacePath}
            workspaceSlug={props.workspaceSlug}
          />
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
