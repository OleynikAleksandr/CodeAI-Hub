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
import {
  loadQuestionnaireForSession,
  resolveIdeaOutputPaths,
} from "./session-region-idea-paths";
import { IDEA_QUESTIONNAIRE_COPY } from "./session-region-questionnaire-copy";

type SessionRegionProps = {
  readonly pickerState: ProviderPickerState;
  readonly selectedStage: FlowStageId | null;
  readonly stageSelectionLocked: boolean;
  readonly selectStage: (stage: FlowStageId) => void;
  readonly clearStageSelection: () => void;
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
  selectedStage,
  stageSelectionLocked,
  selectStage,
  clearStageSelection,
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
  const handleQuestionnaireSubmit = useCallback(async () => {
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

    try {
      await questionnaireService.flushSave(
        questionnaireSnapshot.sessionId,
        questionnaireSnapshot.path,
        content
      );
      const outputPaths =
        resolveIdeaOutputPaths(
          sessionViewProps.sessions,
          questionnaireSnapshot.sessionId
        ) ?? (await ideaCollector.getOutputPaths());
      await ideaCollector.beginQuestionnaireReview(
        questionnaireSnapshot.sessionId,
        submissionMessage,
        outputPaths
      );
      setQuestionnaireSnapshot(null);
      setQuestionnaireVisible(false);
    } catch {
      /* ignore submission errors */
    }
  }, [
    ideaCollector,
    questionnaireService,
    questionnaireSnapshot,
    sessionViewProps.sessions,
  ]);
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
    loadQuestionnaireForSession(
      questionnaireService,
      sessionViewProps.sessions,
      activeSessionId
    )
      .then((snapshot) => {
        if (snapshot) {
          setQuestionnaireSnapshot(snapshot);
          setQuestionnaireVisible(true);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [
    activeSessionId,
    questionnaireService,
    questionnaireSnapshot,
    sessionViewProps.sessions,
  ]);
  const handleProviderConfirm = (providerIds: readonly ProviderStackId[]) => {
    if (selectedStage === "idea") {
      pendingQuestionnaireRef.current = true;
    }
    confirmSelection(providerIds);
  };
  const handleStageClick = (stage: FlowStageId) => {
    selectStage(stage);
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
    !pickerState.visible;
  const showSessionView = !(pickerState.visible || showQuestionnaire);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    if (!pendingQuestionnaireRef.current) {
      return;
    }
    pendingQuestionnaireRef.current = false;
    loadQuestionnaireForSession(
      questionnaireService,
      sessionViewProps.sessions,
      activeSessionId
    )
      .then((snapshot) => {
        if (snapshot) {
          setQuestionnaireSnapshot(snapshot);
          setQuestionnaireVisible(true);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [activeSessionId, questionnaireService, sessionViewProps.sessions]);

  const questionnaireTitle = IDEA_QUESTIONNAIRE_COPY.title;
  const questionnaireDescription = IDEA_QUESTIONNAIRE_COPY.description;
  const questionnaireSubmitLabel = IDEA_QUESTIONNAIRE_COPY.submitLabel;
  const questionnaireCancelLabel = IDEA_QUESTIONNAIRE_COPY.cancelLabel;
  const questionnaireResumeLabel = IDEA_QUESTIONNAIRE_COPY.resumeLabel;
  const questionnaireResumeNote = IDEA_QUESTIONNAIRE_COPY.resumeNote;

  const filteredProviders =
    selectedStage && selectedStage !== "chat"
      ? pickerState.providers.filter(
          (provider) =>
            provider.id === "codexCli" || provider.id === "claudeCodeCli"
        )
      : pickerState.providers;
  const showStagePicker = pickerState.visible && selectedStage === null;
  const showProviderPicker = pickerState.visible && selectedStage !== null;

  const providerPickerSecondaryLabel = stageSelectionLocked ? "Cancel" : "Back";
  const handleProviderPickerSecondary = stageSelectionLocked
    ? cancelSelection
    : clearStageSelection;

  return (
    <div className="app-shell__session-region">
      <ProviderPicker
        onConfirm={handleProviderConfirm}
        onSecondary={handleProviderPickerSecondary}
        providers={filteredProviders}
        secondaryLabel={providerPickerSecondaryLabel}
        visible={showProviderPicker}
      />
      <FlowWizardPicker
        onCancel={cancelSelection}
        onStageClick={handleStageClick}
        providers={pickerState.providers}
        selectedStage={selectedStage}
        visible={showStagePicker}
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
