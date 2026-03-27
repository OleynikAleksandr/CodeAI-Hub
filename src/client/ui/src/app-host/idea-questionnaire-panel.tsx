import type { MutableRefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionRecord } from "../../../../types/session";
import { IdeaQuestionnaireView } from "../components/idea-questionnaire/idea-questionnaire-view";
import { IdeaCollectorService } from "../services/idea-collector-service";
import {
  buildQuestionnaireSubmissionMessage,
  notifyMissingIdeaContext,
} from "../services/idea-questionnaire-messages";
import {
  IdeaQuestionnaireService,
  type QuestionnaireSnapshot,
} from "../services/idea-questionnaire-service";
import { QuestionnaireResumeBanner } from "./questionnaire-resume-banner";
import {
  loadQuestionnaireForSession,
  resolveIdeaOutputPaths,
} from "./session-region-idea-paths";
import { IDEA_QUESTIONNAIRE_COPY } from "./session-region-questionnaire-copy";

interface IdeaQuestionnairePanelProps {
  readonly activeSessionId: string | null;
  readonly onQuestionnaireVisibleChange: (visible: boolean) => void;
  readonly pendingQuestionnaireRef: MutableRefObject<boolean>;
  readonly pickerVisible: boolean;
  readonly sessions: readonly SessionRecord[];
}

export const IdeaQuestionnairePanel = ({
  activeSessionId,
  sessions,
  pendingQuestionnaireRef,
  pickerVisible,
  onQuestionnaireVisibleChange,
}: IdeaQuestionnairePanelProps) => {
  const ideaCollectorRef = useRef(new IdeaCollectorService());
  const questionnaireServiceRef = useRef(new IdeaQuestionnaireService());
  const [questionnaireSnapshot, setQuestionnaireSnapshot] =
    useState<QuestionnaireSnapshot | null>(null);
  const [questionnaireVisible, setQuestionnaireVisible] = useState(false);
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

  const handleQuestionnaireSubmit = useCallback(async () => {
    if (!questionnaireSnapshot) {
      return;
    }
    const content = questionnaireService.renderQuestionnaire(
      questionnaireSnapshot.template,
      questionnaireSnapshot.placeholders,
      questionnaireSnapshot.answers
    );
    const submissionMessage = buildQuestionnaireSubmissionMessage(
      questionnaireSnapshot.path
    );
    try {
      await questionnaireService.flushSave(
        questionnaireSnapshot.sessionId,
        questionnaireSnapshot.path,
        content
      );
      const outputPaths = resolveIdeaOutputPaths(
        sessions,
        questionnaireSnapshot.sessionId
      );
      if (!outputPaths) {
        notifyMissingIdeaContext(questionnaireSnapshot.sessionId);
        return;
      }
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
  }, [ideaCollector, questionnaireService, questionnaireSnapshot, sessions]);

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
    }
    loadQuestionnaireForSession(questionnaireService, sessions, activeSessionId)
      .then((snapshot) => {
        if (snapshot) {
          setQuestionnaireSnapshot(snapshot);
          setQuestionnaireVisible(true);
        }
      })
      .catch(() => {
        /* ignore questionnaire load errors */
      });
  }, [activeSessionId, questionnaireService, questionnaireSnapshot, sessions]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }
    if (!pendingQuestionnaireRef.current) {
      return;
    }
    pendingQuestionnaireRef.current = false;
    loadQuestionnaireForSession(questionnaireService, sessions, activeSessionId)
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
    pendingQuestionnaireRef,
    questionnaireService,
    sessions,
  ]);

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
    !pickerVisible;

  useEffect(() => {
    onQuestionnaireVisibleChange(showQuestionnaire);
  }, [onQuestionnaireVisibleChange, showQuestionnaire]);

  if (!(showQuestionnaire || showQuestionnaireResume)) {
    return null;
  }

  const questionnaireTitle = IDEA_QUESTIONNAIRE_COPY.title;
  const questionnaireDescription = IDEA_QUESTIONNAIRE_COPY.description;
  const questionnaireSubmitLabel = IDEA_QUESTIONNAIRE_COPY.submitLabel;
  const questionnaireCancelLabel = IDEA_QUESTIONNAIRE_COPY.cancelLabel;
  const questionnaireResumeLabel = IDEA_QUESTIONNAIRE_COPY.resumeLabel;
  const questionnaireResumeNote = IDEA_QUESTIONNAIRE_COPY.resumeNote;

  return (
    <>
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
    </>
  );
};
