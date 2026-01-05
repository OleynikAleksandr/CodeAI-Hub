import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import type { FlowStageId } from "../components/flow-wizard";
import { IdeaQuestionnaireView } from "../components/idea-questionnaire/idea-questionnaire-view";
import { ProviderPicker, type ProviderPickerState } from "../provider-picker";
import { IdeaCollectorService } from "../services/idea-collector-service";
import type { QuestionnaireSnapshot } from "../services/idea-questionnaire-service";
import { IdeaQuestionnaireService } from "../services/idea-questionnaire-service";
import type { SessionSnapshots } from "../session/helpers";
import SessionView from "../session/session-view";
import { FlowWizardPicker } from "./flow-wizard-picker";
import type { ProviderLabels } from "./provider-picker-state";
import { QuestionnaireResumeBanner } from "./questionnaire-resume-banner";

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
  const [questionnaireVisible, setQuestionnaireVisible] = useState(false);

  const ideaCollector = ideaCollectorRef.current;
  const questionnaireService = questionnaireServiceRef.current;
  const activeSessionId = sessionViewProps.activeSessionId;

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
      "Before reading the questionnaire, review the documents listed in " +
      'section "0. Документы для чтения перед анкетой" (if any). Then ' +
      `review \`${questionnaireSnapshot.path}\` against the contract, ` +
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
        setQuestionnaireVisible(false);
      })
      .catch(() => {
        /* ignore submission errors */
      });
  }, [ideaCollector, questionnaireService, questionnaireSnapshot]);

  const handleQuestionnaireCancel = useCallback(() => {
    if (!questionnaireSnapshot) {
      setQuestionnaireVisible(false);
      return;
    }
    const content = questionnaireService.renderQuestionnaire(
      questionnaireSnapshot.template,
      questionnaireSnapshot.placeholders,
      questionnaireSnapshot.answers
    );
    questionnaireService
      .flushSave(
        questionnaireSnapshot.sessionId,
        questionnaireSnapshot.path,
        content
      )
      .catch(() => {
        /* ignore save errors */
      })
      .finally(() => {
        setQuestionnaireVisible(false);
      });
  }, [questionnaireService, questionnaireSnapshot]);

  const handleQuestionnaireResume = useCallback(() => {
    if (!activeSessionId) {
      return;
    }
    if (questionnaireSnapshot?.sessionId === activeSessionId) {
      setQuestionnaireVisible(true);
      return;
    }
    questionnaireService
      .loadQuestionnaire(activeSessionId)
      .then((snapshot) => {
        if (snapshot) {
          setQuestionnaireSnapshot(snapshot);
          setQuestionnaireVisible(true);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [activeSessionId, questionnaireService, questionnaireSnapshot]);

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

  const hasPendingQuestionnaire = activeSessionId
    ? ideaCollector.isQuestionnairePending(activeSessionId)
    : false;
  const showQuestionnaire = Boolean(
    questionnaireVisible &&
      questionnaireSnapshot &&
      activeSessionId &&
      questionnaireSnapshot.sessionId === activeSessionId
  );
  const showQuestionnaireResume =
    Boolean(activeSessionId) &&
    hasPendingQuestionnaire &&
    !showQuestionnaire &&
    !pickerState.visible &&
    !flowWizardVisible;
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
          setQuestionnaireVisible(true);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [activeSessionId, questionnaireService]);

  const questionnaireTitle = "Анкета идеи";
  const questionnaireDescription =
    "Заполните анкету, приложите ссылки на документы и отправьте на проверку.";
  const questionnaireSubmitLabel = "Отправить анкету";
  const questionnaireCancelLabel = "Отмена";
  const questionnaireResumeLabel = "Продолжить анкету";
  const questionnaireResumeNote =
    "Есть незавершенная анкета для этой сессии. Можно продолжить заполнение.";

  return (
    <div className="app-shell__session-region">
      <ProviderPicker
        onCancel={cancelSelection}
        onConfirm={handleProviderConfirm}
        providers={pickerState.providers}
        visible={pickerState.visible}
      />
      <FlowWizardPicker
        onCancel={closeFlowWizard}
        onStageClick={handleFlowStageClick}
        providerId={flowWizardProviderId}
        visible={flowWizardVisible}
      />
      {showQuestionnaireResume ? (
        <QuestionnaireResumeBanner
          note={questionnaireResumeNote}
          onResume={handleQuestionnaireResume}
          resumeLabel={questionnaireResumeLabel}
        />
      ) : null}
      {showQuestionnaire && questionnaireSnapshot ? (
        <IdeaQuestionnaireView
          answers={questionnaireSnapshot.answers}
          cancelLabel={questionnaireCancelLabel}
          description={questionnaireDescription}
          onAnswerChange={handleAnswerChange}
          onCancel={handleQuestionnaireCancel}
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
