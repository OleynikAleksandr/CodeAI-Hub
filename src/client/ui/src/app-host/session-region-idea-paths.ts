import type { SessionRecord } from "../../../../types/session";
import type { IdeaContractSnapshot } from "../services/idea-collector-contract";
import { postSystemNotice } from "../services/idea-collector-support";
import type {
  IdeaQuestionnaireService,
  QuestionnaireSnapshot,
} from "../services/idea-questionnaire-service";

export type IdeaOutputPaths = IdeaContractSnapshot["outputPaths"];

export const resolveIdeaOutputPaths = (
  sessions: readonly SessionRecord[],
  sessionId: string
): IdeaOutputPaths | null => {
  const session = sessions.find((record) => record.id === sessionId);
  if (!session?.initiativeSlug) {
    return null;
  }
  return {
    idea: `.codeai-hub/${session.initiativeSlug}/description/Final_Description.md`,
    virtualSimulation: `.codeai-hub/${session.initiativeSlug}/virtual_simulation/virtual-simulation.md`,
  };
};

export const loadQuestionnaireForSession = (
  questionnaireService: IdeaQuestionnaireService,
  sessions: readonly SessionRecord[],
  sessionId: string
): Promise<QuestionnaireSnapshot | null> => {
  const outputPaths = resolveIdeaOutputPaths(sessions, sessionId);
  if (!outputPaths) {
    postSystemNotice(
      sessionId,
      "Не могу открыть анкету: Core еще не вернул initiative контекст. Подождите и нажмите «Возобновить анкету»."
    );
    return Promise.resolve(null);
  }
  return questionnaireService.loadQuestionnaire(sessionId, outputPaths);
};
