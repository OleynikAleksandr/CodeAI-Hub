import type { SessionRecord } from "../../../../types/session";
import type { IdeaContractSnapshot } from "../services/idea-collector-contract";
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
  if (!(session?.initiativeSlug && session.runSlug)) {
    return null;
  }
  return {
    idea: `.codeai-hub/initiatives/${session.initiativeSlug}/runs/${session.runSlug}/idea/idea.md`,
    virtualSimulation: `.codeai-hub/initiatives/${session.initiativeSlug}/runs/${session.runSlug}/idea/virtual-simulation.md`,
  };
};

export const loadQuestionnaireForSession = (
  questionnaireService: IdeaQuestionnaireService,
  sessions: readonly SessionRecord[],
  sessionId: string
): Promise<QuestionnaireSnapshot | null> => {
  const outputPaths = resolveIdeaOutputPaths(sessions, sessionId);
  return questionnaireService.loadQuestionnaire(
    sessionId,
    outputPaths ?? undefined
  );
};
