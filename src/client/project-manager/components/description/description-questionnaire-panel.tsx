import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IdeaQuestionnaireView } from "../../../ui/src/components/idea-questionnaire/idea-questionnaire-view";
import {
  DescriptionQuestionnaireService,
} from "../../services/description-questionnaire-service";

interface DescriptionQuestionnairePanelProps {
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly onClose?: () => void;
}

type PanelState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ready";
      readonly sessionId: string;
      readonly questionnairePath: string;
      readonly template: string;
      readonly placeholders: Record<string, string>;
      readonly questions: readonly {
        id: string;
        title: string;
        titleHint?: string;
        description?: string;
        hint?: string;
      }[];
    };

export const DescriptionQuestionnairePanel: React.FC<
  DescriptionQuestionnairePanelProps
> = ({ workspaceName, workspacePath, onClose }) => {
  const serviceRef = useRef(new DescriptionQuestionnaireService());
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const resolvedWorkspaceName =
    workspaceName && workspaceName.trim().length > 0
      ? workspaceName.trim()
      : "Workspace";

  const canLoad =
    typeof workspacePath === "string" && workspacePath.trim().length > 0;

  useEffect(() => {
    if (!canLoad) {
      setPanelState({ status: "idle" });
      return;
    }

    const service = serviceRef.current;
    let cancelled = false;

    setPanelState({ status: "loading" });
    service
      .load({ name: resolvedWorkspaceName, path: workspacePath })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.status !== "ok") {
          setPanelState({ status: "error" });
          return;
        }
        setPanelState({
          status: "ready",
          sessionId: result.value.sessionId,
          questionnairePath: result.value.path,
          template: result.value.template,
          placeholders: result.value.placeholders,
          questions: result.value.questions,
        });
        setAnswers(result.value.answers);
      })
      .catch(() => {
        if (!cancelled) {
          setPanelState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canLoad, resolvedWorkspaceName, workspacePath]);

  const title = useMemo(
    () => `Description questionnaire — ${resolvedWorkspaceName}`,
    [resolvedWorkspaceName]
  );

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (panelState.status !== "ready") {
      return;
    }
    const service = serviceRef.current;
    await service.save(
      panelState.sessionId,
      panelState.questionnairePath,
      panelState.template,
      panelState.placeholders,
      answers
    );
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!canLoad) {
    return (
      <div className="pm-placeholder">Select a workspace to start.</div>
    );
  }

  if (panelState.status === "loading") {
    return <div className="pm-placeholder">Loading description questionnaire...</div>;
  }

  if (panelState.status === "error") {
    return (
      <div className="pm-placeholder">
        Unable to load the description questionnaire.
      </div>
    );
  }

  if (panelState.status !== "ready") {
    return null;
  }

  return (
    <IdeaQuestionnaireView
      answers={answers}
      cancelLabel="Close"
      description="Complete the description questionnaire to seed the workflow tree."
      onAnswerChange={handleAnswerChange}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      questions={panelState.questions}
      submitLabel="Save description questionnaire"
      title={title}
    />
  );
};
