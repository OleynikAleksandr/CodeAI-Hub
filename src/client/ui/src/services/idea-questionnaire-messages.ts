import { postSystemNotice } from "./idea-collector-support";

const MISSING_IDEA_CONTEXT_MESSAGE =
  "Не могу отправить анкету: Core еще не вернул initiative/run контекст. Подождите и нажмите «Возобновить анкету».";

export const notifyMissingIdeaContext = (sessionId: string): void => {
  postSystemNotice(sessionId, MISSING_IDEA_CONTEXT_MESSAGE);
};
