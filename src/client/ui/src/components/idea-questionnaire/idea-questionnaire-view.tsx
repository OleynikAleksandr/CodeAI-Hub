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
  readonly cancelLabel: string;
  readonly description?: string;
  readonly onAnswerChange: (questionId: string, value: string) => void;
  readonly onCancel: () => void;
  readonly onSubmit: () => void;
  readonly questions: readonly QuestionnaireQuestion[];
  readonly submitLabel: string;
  readonly title: string;
}

export const IdeaQuestionnaireView = ({
  title,
  description,
  questions,
  answers,
  submitLabel,
  cancelLabel,
  onAnswerChange,
  onSubmit,
  onCancel,
}: IdeaQuestionnaireViewProps) => (
  <section aria-label="Idea questionnaire" style={questionnairePageStyles}>
    <header style={questionnaireHeaderStyles}>
      <h1 style={questionnaireTitleStyles}>{title}</h1>
      {description ? (
        <p style={questionnaireDescriptionStyles}>{description}</p>
      ) : null}
    </header>

    <div style={questionnaireListStyles}>
      {questions.map((question) => (
        <QuestionBlock
          key={question.id}
          onChange={onAnswerChange}
          question={question}
          value={answers[question.id] ?? ""}
        />
      ))}
    </div>

    <div style={questionnaireFooterStyles}>
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
