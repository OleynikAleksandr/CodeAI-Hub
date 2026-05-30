import { useEffect, useRef } from "react";
import { QuestionBlock, type QuestionnaireQuestion } from "./question-block";
import {
  questionnaireCancelButtonStyles,
  questionnaireDescriptionStyles,
  questionnaireFooterStyles,
  questionnaireHeaderStyles,
  questionnaireListStyles,
  questionnairePageStyles,
  questionnaireSubmitButtonStyles,
  questionnaireTitleStyles,
} from "./styles";

interface IdeaQuestionnaireViewProps {
  readonly answers: Record<string, string>;
  readonly autoScrollComplete?: boolean;
  readonly autoScrollTargetQuestionId?: string | null;
  readonly cancelLabel: string;
  readonly description?: string;
  readonly onAnswerChange: (questionId: string, value: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
  readonly questions: readonly QuestionnaireQuestion[];
  readonly submitLabel: string;
  readonly title: string;
}

const SECTION_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "start",
};
const SUBMIT_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "end",
};

export const IdeaQuestionnaireView = ({
  title,
  description,
  questions,
  answers,
  submitLabel,
  cancelLabel,
  autoScrollComplete,
  autoScrollTargetQuestionId,
  onAnswerChange,
  onSubmit,
  onCancel,
}: IdeaQuestionnaireViewProps) => {
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const footerRef = useRef<HTMLDivElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const wasCompleteRef = useRef(false);

  // Optional auto-scroll: enabled only when the parent passes the props
  // (description questionnaire). Without them the idea questionnaire keeps
  // its previous behavior unchanged.
  useEffect(() => {
    const enabled =
      autoScrollComplete !== undefined ||
      autoScrollTargetQuestionId !== undefined;
    if (!enabled || questions.length === 0) {
      return;
    }

    const scrollToFooter = () =>
      footerRef.current?.scrollIntoView(SUBMIT_SCROLL_OPTIONS);
    const scrollToSection = (questionId: string) =>
      sectionRefs.current
        .get(questionId)
        ?.scrollIntoView(SECTION_SCROLL_OPTIONS);

    // After the initial resume scroll, only react to the moment the
    // questionnaire becomes fully complete (scroll down to the submit footer).
    if (hasInitialScrollRef.current) {
      if (autoScrollComplete && !wasCompleteRef.current) {
        scrollToFooter();
      }
      wasCompleteRef.current = Boolean(autoScrollComplete);
      return;
    }

    // Initial scroll on load: resume at the first unfilled required section,
    // or jump to the submit footer when everything required is already filled.
    hasInitialScrollRef.current = true;
    wasCompleteRef.current = Boolean(autoScrollComplete);
    if (autoScrollComplete) {
      scrollToFooter();
    } else if (autoScrollTargetQuestionId) {
      scrollToSection(autoScrollTargetQuestionId);
    }
  }, [autoScrollComplete, autoScrollTargetQuestionId, questions]);

  return (
    <section aria-label="Idea questionnaire" style={questionnairePageStyles}>
      <header style={questionnaireHeaderStyles}>
        <h1 style={questionnaireTitleStyles}>{title}</h1>
        {description ? (
          <p style={questionnaireDescriptionStyles}>{description}</p>
        ) : null}
      </header>

      <div style={questionnaireListStyles}>
        {questions.map((question) => (
          <div
            key={question.id}
            ref={(element) => {
              if (element) {
                sectionRefs.current.set(question.id, element);
              } else {
                sectionRefs.current.delete(question.id);
              }
            }}
          >
            <QuestionBlock
              onChange={onAnswerChange}
              question={question}
              value={answers[question.id] ?? ""}
            />
          </div>
        ))}
      </div>

      <div ref={footerRef} style={questionnaireFooterStyles}>
        <button
          onClick={onCancel}
          style={questionnaireCancelButtonStyles}
          type="button"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onSubmit}
          style={questionnaireSubmitButtonStyles}
          type="button"
        >
          {submitLabel}
        </button>
      </div>
    </section>
  );
};
