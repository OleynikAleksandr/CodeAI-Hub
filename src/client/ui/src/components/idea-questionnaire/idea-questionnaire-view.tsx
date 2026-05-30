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
// Keep re-pinning to the scroll target for a short window after the initial
// scroll, so auto-height textareas that expand to fit filled content (growing
// the page) do not leave the viewport stranded mid-list.
const SETTLE_WINDOW_MS = 600;

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
  const listRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const footerRef = useRef<HTMLDivElement | null>(null);
  const hasInitialScrollRef = useRef(false);
  const wasCompleteRef = useRef(false);

  // Optional auto-scroll: enabled only when the parent passes the props
  // (description questionnaire). Without them the idea questionnaire keeps its
  // previous behavior unchanged. Scrolls on initial load (resume at the first
  // unfilled required section, or the submit footer when complete) and at the
  // moment the questionnaire becomes complete.
  useEffect(() => {
    const enabled =
      autoScrollComplete !== undefined ||
      autoScrollTargetQuestionId !== undefined;
    if (!enabled || questions.length === 0) {
      return;
    }

    const isInitial = !hasInitialScrollRef.current;
    const becameComplete =
      !isInitial && Boolean(autoScrollComplete) && !wasCompleteRef.current;
    hasInitialScrollRef.current = true;
    wasCompleteRef.current = Boolean(autoScrollComplete);
    if (!(isInitial || becameComplete)) {
      return;
    }

    const target = autoScrollComplete
      ? { element: footerRef.current, options: SUBMIT_SCROLL_OPTIONS }
      : {
          element: autoScrollTargetQuestionId
            ? (sectionRefs.current.get(autoScrollTargetQuestionId) ?? null)
            : null,
          options: SECTION_SCROLL_OPTIONS,
        };
    if (!target.element) {
      return;
    }

    const scrollToTarget = () => target.element?.scrollIntoView(target.options);
    scrollToTarget();

    // Re-pin while the list height keeps changing (textarea auto-height).
    const observer = new ResizeObserver(scrollToTarget);
    if (listRef.current) {
      observer.observe(listRef.current);
    }
    const stopTimer = window.setTimeout(() => {
      observer.disconnect();
    }, SETTLE_WINDOW_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(stopTimer);
    };
  }, [autoScrollComplete, autoScrollTargetQuestionId, questions]);

  return (
    <section aria-label="Idea questionnaire" style={questionnairePageStyles}>
      <header style={questionnaireHeaderStyles}>
        <h1 style={questionnaireTitleStyles}>{title}</h1>
        {description ? (
          <p style={questionnaireDescriptionStyles}>{description}</p>
        ) : null}
      </header>

      <div ref={listRef} style={questionnaireListStyles}>
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
