import type React from "react";
import { useEffect, useState } from "react";
import MarkdownContent from "../../../ui/src/session/markdown-content";
import { loadDescriptionContract } from "../../../ui/src/services/idea-collector-contract";

const HELP_LOAD_ERROR =
  "Не удалось загрузить Description Help: template недоступен.";

export const DescriptionStepHelp: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);

    loadDescriptionContract()
      .then((contract) => {
        if (cancelled) {
          return;
        }
        const template = contract.template?.trim() ?? "";
        if (template.length === 0) {
          setError(HELP_LOAD_ERROR);
          return;
        }
        setContent(template);
      })
      .catch((loadError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(
          loadError instanceof Error ? loadError.message : HELP_LOAD_ERROR
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pm-details">
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <strong>Description Help</strong>
      </div>
      {error ? <div className="pm-placeholder">{error}</div> : null}
      {!error && content === null ? (
        <div className="pm-placeholder">Загружаем Description Help...</div>
      ) : null}
      {!error && content !== null ? (
        <MarkdownContent className="pm-artifact-markdown" content={content} />
      ) : null}
    </div>
  );
};
