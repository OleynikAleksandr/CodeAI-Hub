// Questionnaire auto-scroll target computation. Determines the first unfilled
// required section (resume target on load) and whether all required sections
// are filled (scroll to the submit footer). Sections marked "(optional)" /
// "(if any)" are skipped; section 11 (out_of_scope) is the last required one.

const OPTIONAL_QUESTIONNAIRE_FIELD_IDS: ReadonlySet<string> = new Set([
  "pre_read_documents",
  "modules_draft",
  "boundaries_draft",
  "constraints",
  "notes",
]);

const isQuestionnaireAnswerEmpty = (value: string | undefined): boolean =>
  value === undefined || value.trim().length === 0;

export interface QuestionnaireAutoScrollState {
  readonly complete: boolean;
  readonly targetQuestionId: string | null;
}

export const EMPTY_QUESTIONNAIRE_AUTO_SCROLL: QuestionnaireAutoScrollState = {
  complete: false,
  targetQuestionId: null,
};

export const computeQuestionnaireAutoScroll = (
  questions: readonly { readonly id: string }[],
  answers: Record<string, string>
): QuestionnaireAutoScrollState => {
  let targetQuestionId: string | null = null;
  for (const question of questions) {
    if (OPTIONAL_QUESTIONNAIRE_FIELD_IDS.has(question.id)) {
      continue;
    }
    if (isQuestionnaireAnswerEmpty(answers[question.id])) {
      targetQuestionId = question.id;
      break;
    }
  }
  return { complete: targetQuestionId === null, targetQuestionId };
};
