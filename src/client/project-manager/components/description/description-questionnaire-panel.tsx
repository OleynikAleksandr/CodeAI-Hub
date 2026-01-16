import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IdeaQuestionnaireView } from "../../../ui/src/components/idea-questionnaire/idea-questionnaire-view";
import {
  DescriptionQuestionnaireService,
} from "../../services/description-questionnaire-service";
import { IdeaCollectorSubmitService } from "../../services/idea-collector-submit-service";

const SAVE_DEBOUNCE_MS = 400;

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
  const ideaCollectorRef = useRef(new IdeaCollectorSubmitService());
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const saveTimerRef = useRef<number | null>(null);
  const submitInFlightRef = useRef(false);

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
    () => `Анкета описания — ${resolvedWorkspaceName}`,
    [resolvedWorkspaceName]
  );

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  useEffect(() => {
    if (panelState.status !== "ready") {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    const timer = window.setTimeout(() => {
      serviceRef.current
        .save(
          panelState.sessionId,
          panelState.questionnairePath,
          panelState.template,
          panelState.placeholders,
          answers
        )
        .catch(() => {
          /* ignore save errors */
        });
    }, SAVE_DEBOUNCE_MS);
    saveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
    };
  }, [answers, panelState]);

  const handleSubmit = async () => {
    if (panelState.status !== "ready" || submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await serviceRef.current.save(
        panelState.sessionId,
        panelState.questionnairePath,
        panelState.template,
        panelState.placeholders,
        answers
      );
      await ideaCollectorRef.current.submitQuestionnaire({
        workspaceName: resolvedWorkspaceName,
        workspacePath: workspacePath ?? "",
        questionnairePath: panelState.questionnairePath,
      });
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const handleCancel = () => {
    onClose?.();
  };

  if (!canLoad) {
    return (
      <div className="pm-placeholder">Выберите workspace, чтобы начать.</div>
    );
  }

  if (panelState.status === "loading") {
    return (
      <div className="pm-placeholder">Загружаем анкету описания...</div>
    );
  }

  if (panelState.status === "error") {
    return (
      <div className="pm-placeholder">
        Не удалось загрузить анкету описания.
      </div>
    );
  }

  if (panelState.status !== "ready") {
    return null;
  }

  return (
    <IdeaQuestionnaireView
      answers={answers}
      cancelLabel="Закрыть"
      description="Анкета сохраняется автоматически. Нажмите «Отправить анкету», чтобы запустить Idea Collector."
      onAnswerChange={handleAnswerChange}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
      questions={panelState.questions}
      submitLabel="Отправить анкету"
      title={title}
    />
  );
};
