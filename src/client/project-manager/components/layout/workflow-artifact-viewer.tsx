import type React from "react";
import { useEffect, useState } from "react";
import { api } from "../../api";
import MarkdownContent from "../../../ui/src/session/markdown-content";

export const WorkflowArtifactViewer: React.FC<{
  readonly description?: React.ReactNode;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
  readonly path: string;
  readonly label: string;
  readonly refreshKey?: number;
  readonly onClose: () => void;
}> = (props) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="pm-details">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <strong title={props.path}>{props.label}</strong>
      </div>
      {props.description ? (
        <div
          style={{
            marginBottom: 12,
            fontSize: 12,
            color: "var(--pm-text-muted)",
          }}
        >
          {props.description}
        </div>
      ) : null}
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
