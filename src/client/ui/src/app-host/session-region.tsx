import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import { type FlowStageId, FlowWizard } from "../components/flow-wizard";
import { IdeaQuestionnaireView } from "../components/idea-questionnaire/idea-questionnaire-view";
import { ProviderPicker, type ProviderPickerState } from "../provider-picker";
import { IdeaCollectorService } from "../services/idea-collector-service";
import type { QuestionnaireSnapshot } from "../services/idea-questionnaire-service";
import { IdeaQuestionnaireService } from "../services/idea-questionnaire-service";
import type { SessionSnapshots } from "../session/helpers";
import SessionView from "../session/session-view";
import type { ProviderLabels } from "./provider-picker-state";

type SessionRegionProps = {
  readonly pickerState: ProviderPickerState;
  readonly flowWizardVisible: boolean;
  readonly flowWizardProviderId: ProviderStackId | null;
  readonly openFlowWizard: (providerId: ProviderStackId) => void;
  readonly closeFlowWizard: () => void;
  readonly confirmSelection: (providerIds: readonly ProviderStackId[]) => void;
  readonly cancelSelection: () => void;
  readonly sessionViewProps: {
    readonly activeSessionId: string | null;
    readonly coreConnectionDetail: string | undefined;
    readonly coreConnectionStatus: "connecting" | "ready" | "error";
    readonly onCloseSession: (sessionId: string) => void;
    readonly onSelectSession: (sessionId: string) => void;
    readonly onSendMessage: (sessionId: string, content: string) => void;
    readonly onToggleTodo: (sessionId: string, todoId: string) => void;
    readonly providerLabels: ProviderLabels;
    readonly sessions: readonly SessionRecord[];
    readonly snapshots: SessionSnapshots;
  };
};

export const SessionRegion = ({
  pickerState,
  flowWizardVisible,
  flowWizardProviderId,
  openFlowWizard,
  closeFlowWizard,
  confirmSelection,
  cancelSelection,
  sessionViewProps,
}: SessionRegionProps) => {
  const ideaCollectorRef = useRef(new IdeaCollectorService());
  const questionnaireServiceRef = useRef(new IdeaQuestionnaireService());
  const pendingQuestionnaireRef = useRef(false);
  const [questionnaireSnapshot, setQuestionnaireSnapshot] =
    useState<QuestionnaireSnapshot | null>(null);

  const ideaCollector = ideaCollectorRef.current;
  const questionnaireService = questionnaireServiceRef.current;

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setQuestionnaireSnapshot((current) => {
        if (!current) {
          return current;
        }
        const answers = { ...current.answers, [questionId]: value };
        const content = questionnaireService.renderQuestionnaire(
          current.template,
          current.placeholders,
          answers
        );
        questionnaireService.queueSave(
          current.sessionId,
          current.path,
          content
        );
        return { ...current, answers };
      });
    },
    [questionnaireService]
  );

  const handleQuestionnaireSubmit = useCallback(() => {
    if (!questionnaireSnapshot) {
      return;
    }
    const content = questionnaireService.renderQuestionnaire(
      questionnaireSnapshot.template,
      questionnaireSnapshot.placeholders,
      questionnaireSnapshot.answers
    );
    const submissionMessage =
      `Please review \`${questionnaireSnapshot.path}\` against the contract, ` +
      "ask any clarifying questions, then wait for OK/approve before finalize.";

    questionnaireService
      .flushSave(
        questionnaireSnapshot.sessionId,
        questionnaireSnapshot.path,
        content
      )
      .then(() =>
        ideaCollector.beginQuestionnaireReview(
          questionnaireSnapshot.sessionId,
          submissionMessage
        )
      )
      .then(() => {
        setQuestionnaireSnapshot(null);
      })
      .catch(() => {
        /* ignore submission errors */
      });
  }, [ideaCollector, questionnaireService, questionnaireSnapshot]);

  const handleProviderConfirm = (providerIds: readonly ProviderStackId[]) => {
    const selectedProvider = providerIds[0];
    if (
      selectedProvider === "codexCli" ||
      selectedProvider === "claudeCodeCli"
    ) {
      openFlowWizard(selectedProvider);
      return;
    }
    confirmSelection(providerIds);
  };

  const handleFlowStageClick = (stage: FlowStageId) => {
    if (stage !== "idea") {
      return;
    }
    if (!flowWizardProviderId) {
      return;
    }
    pendingQuestionnaireRef.current = true;
    confirmSelection([flowWizardProviderId]);
  };

  const activeSessionId = sessionViewProps.activeSessionId;
  const showQuestionnaire =
    questionnaireSnapshot &&
    activeSessionId &&
    questionnaireSnapshot.sessionId === activeSessionId;
  const showSessionView = !(
    pickerState.visible ||
    flowWizardVisible ||
    showQuestionnaire
  );

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    if (!pendingQuestionnaireRef.current) {
      return;
    }
    pendingQuestionnaireRef.current = false;
    questionnaireService
      .loadQuestionnaire(activeSessionId)
      .then((snapshot) => {
        if (snapshot) {
          setQuestionnaireSnapshot(snapshot);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [activeSessionId, questionnaireService]);

  const questionnaireTitle = useMemo(() => "Idea Questionnaire", []);
  const questionnaireDescription = useMemo(
    () =>
      "Fill out the questionnaire and attach any supporting files or references.",
    []
  );
  const questionnaireSubmitLabel = useMemo(() => "Send questionnaire", []);

  return (
    <div className="app-shell__session-region">
      <ProviderPicker
        onCancel={cancelSelection}
        onConfirm={handleProviderConfirm}
        providers={pickerState.providers}
        visible={pickerState.visible}
      />
      {flowWizardVisible ? (
        <div className="provider-picker">
          <FlowWizard activeStage="idea" onStageClick={handleFlowStageClick} />
          <div className="provider-picker__actions">
            <output aria-live="polite" className="provider-picker__status">
              {flowWizardProviderId === "codexCli" ||
              flowWizardProviderId === "claudeCodeCli"
                ? "Click Idea to start."
                : "Select a stage to continue."}
            </output>
            <div className="provider-picker__action-buttons">
              <button
                className="provider-picker__secondary"
                onClick={closeFlowWizard}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showQuestionnaire && questionnaireSnapshot ? (
        <IdeaQuestionnaireView
          answers={questionnaireSnapshot.answers}
          description={questionnaireDescription}
          onAnswerChange={handleAnswerChange}
          onSubmit={handleQuestionnaireSubmit}
          questions={questionnaireSnapshot.questions}
          submitLabel={questionnaireSubmitLabel}
          title={questionnaireTitle}
        />
      ) : null}
      {showSessionView ? (
        <SessionView
          activeSessionId={sessionViewProps.activeSessionId}
          coreConnectionDetail={sessionViewProps.coreConnectionDetail}
          coreConnectionStatus={sessionViewProps.coreConnectionStatus}
          onCloseSession={sessionViewProps.onCloseSession}
          onSelectSession={sessionViewProps.onSelectSession}
          onSendMessage={sessionViewProps.onSendMessage}
          onToggleTodo={sessionViewProps.onToggleTodo}
          providerLabels={sessionViewProps.providerLabels}
          sessions={sessionViewProps.sessions}
          showEmptyState
          snapshots={sessionViewProps.snapshots}
        />
      ) : null}
    </div>
  );
};
