import { QuestionBlock, type QuestionnaireQuestion } from "./question-block";
import {
  questionnaireDescriptionStyles,
  questionnaireFooterStyles,
  questionnaireHeaderStyles,
  questionnaireListStyles,
  questionnairePageStyles,
  questionnaireSubmitButtonStyles,
  questionnaireTitleStyles,
} from "./styles";

type IdeaQuestionnaireViewProps = {
  readonly title: string;
  readonly description?: string;
  readonly questions: readonly QuestionnaireQuestion[];
  readonly answers: Record<string, string>;
  readonly submitLabel: string;
  readonly onAnswerChange: (questionId: string, value: string) => void;
  readonly onSubmit: () => void;
};

export const IdeaQuestionnaireView = ({
  title,
  description,
  questions,
  answers,
  submitLabel,
  onAnswerChange,
  onSubmit,
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
        onClick={onSubmit}
        style={questionnaireSubmitButtonStyles}
        type="button"
      >
        {submitLabel}
      </button>
    </div>
  </section>
);
