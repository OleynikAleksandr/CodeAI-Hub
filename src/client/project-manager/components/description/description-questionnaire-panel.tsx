import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { IdeaQuestionnaireView } from "../../../ui/src/components/idea-questionnaire/idea-questionnaire-view";
import { DescriptionQuestionnaireService } from "../../services/description-questionnaire-service";
import { DescriptionSubmitService } from "../../services/description-submit-service";
import type { ProviderStackDescriptor, ProviderStackId } from "../../../../types/provider";
import { api } from "../../api";
import { toWorkflowWorkspaceSlug } from "../../services/workflow-state-client";
import { DescriptionProviderPicker } from "./description-provider-picker";

const SAVE_DEBOUNCE_MS = 400;

interface DescriptionQuestionnairePanelProps {
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string;
  readonly onClose?: () => void;
  readonly onIdeaSessionCreated?: (sessionId: string) => void;
  readonly onIdeaSessionCreatePendingChange?: (
    payload: { readonly providerTitle: string } | null
  ) => void;
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
> = ({
  workspaceName,
  workspacePath,
  workspaceSlug,
  onClose,
  onIdeaSessionCreated,
  onIdeaSessionCreatePendingChange,
}) => {
  const serviceRef = useRef(new DescriptionQuestionnaireService());
  const descriptionSubmitRef = useRef(new DescriptionSubmitService());
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [providerPickerOpen, setProviderPickerOpen] = useState(false);
  const [providerOptions, setProviderOptions] = useState<
    readonly ProviderStackDescriptor[]
  >([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const submitInFlightRef = useRef(false);

  const resolvedWorkspaceName =
    workspaceName && workspaceName.trim().length > 0
      ? workspaceName.trim()
      : "Workspace";

  const resolvedWorkspaceSlug =
    typeof workspaceSlug === "string" && workspaceSlug.trim().length > 0
      ? workspaceSlug.trim()
      : toWorkflowWorkspaceSlug(resolvedWorkspaceName);

  const canLoad =
    typeof workspacePath === "string" && workspacePath.trim().length > 0;
  useEffect(() => {
    if (!canLoad) {
      setPanelState({ status: "idle" });
      return;
    }

    const service = serviceRef.current;
    let cancelled = false;

    setAnswers({});
    setSubmitError(null);
    onIdeaSessionCreatePendingChange?.(null);
    setProviderPickerOpen(false);
    submitInFlightRef.current = false;
    setPanelState({ status: "loading" });
    service
      .load({
        name: resolvedWorkspaceName,
        path: workspacePath,
        slug: resolvedWorkspaceSlug,
      })
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
  }, [
    canLoad,
    onIdeaSessionCreatePendingChange,
    resolvedWorkspaceName,
    resolvedWorkspaceSlug,
    workspacePath,
  ]);

  const title = useMemo(() => `Анкета описания — ${resolvedWorkspaceName}`, [resolvedWorkspaceName]);

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

  const submitQuestionnaire = async (providerId: ProviderStackId) => {
    if (panelState.status !== "ready" || submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    setSubmitError(null);
    const providerTitle =
      providerOptions.find((provider) => provider.id === providerId)?.title ??
      null;
    onIdeaSessionCreatePendingChange?.({
      providerTitle: providerTitle ?? providerId,
    });
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
      await descriptionSubmitRef.current.submitQuestionnaire({
        workspaceName: resolvedWorkspaceName,
        workspaceSlug: resolvedWorkspaceSlug,
        workspacePath: workspacePath ?? "",
        questionnairePath: panelState.questionnairePath,
        stage: "description",
        providerId,
        onSessionCreated: onIdeaSessionCreated,
      });
      if (workspacePath) {
        window.dispatchEvent(
          new CustomEvent("pm:artifact:selected", {
            detail: {
              label: "questionnaire.md",
              path: panelState.questionnairePath,
              workspacePath,
              workspaceSlug: resolvedWorkspaceSlug,
            },
          })
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Не удалось отправить анкету."
      );
      onIdeaSessionCreatePendingChange?.(null);
    } finally {
      submitInFlightRef.current = false;
    }
  };

  const handleSubmit = () => {
    if (panelState.status !== "ready" || submitInFlightRef.current) {
      return;
    }
    setSubmitError(null);
    setProviderOptions(api.getIdeaCollectorProviders());
    setProviderPickerOpen(true);
  };

  const handleProviderConfirm = (providerId: ProviderStackId) => {
    setProviderPickerOpen(false);
    void submitQuestionnaire(providerId);
  };

  const handleProviderCancel = () => setProviderPickerOpen(false);
  const handleCancel = () => onClose?.();

  if (!canLoad) {
    return <div className="pm-placeholder">Выберите workspace, чтобы начать.</div>;
  }
  if (panelState.status === "loading") {
    return <div className="pm-placeholder">Загружаем анкету описания...</div>;
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
    <div className="pm-questionnaire-wrapper">
      {submitError ? (
        <div className="pm-questionnaire-alert">{submitError}</div>
      ) : null}
      <IdeaQuestionnaireView
        answers={answers}
        cancelLabel="Close"
        description="Анкета сохраняется автоматически. Нажмите «Submit questionnaire», выберите провайдера и дождитесь запуска Description. Диалог можно продолжать в той же сессии до финальной версии. Итоговый документ сохраняется в .codeai-hub/<workspace>/description/Final_Description.md."
        onAnswerChange={handleAnswerChange}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        questions={panelState.questions}
        submitLabel="Submit questionnaire"
        title={title}
      />
      <DescriptionProviderPicker
        onCancel={handleProviderCancel}
        onConfirm={handleProviderConfirm}
        providers={providerOptions}
        visible={providerPickerOpen}
      />
    </div>
  );
};
