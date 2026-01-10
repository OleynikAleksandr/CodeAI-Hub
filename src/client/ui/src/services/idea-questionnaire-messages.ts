import { postSystemNotice } from "./idea-collector-support";

const MISSING_IDEA_CONTEXT_MESSAGE =
  "Не могу отправить анкету: Core еще не вернул initiative/run контекст. Подождите и нажмите «Возобновить анкету».";

export const buildQuestionnaireSubmissionMessage = (
  questionnairePath: string
): string =>
  "Before reading the questionnaire, review the documents listed in " +
  'section "0. Документы для чтения перед анкетой" (if any). Then ' +
  `review \`${questionnairePath}\` against the contract, ` +
  "ask any clarifying questions, then wait for OK/approve before finalize.";

export const notifyMissingIdeaContext = (sessionId: string): void => {
  postSystemNotice(sessionId, MISSING_IDEA_CONTEXT_MESSAGE);
};
