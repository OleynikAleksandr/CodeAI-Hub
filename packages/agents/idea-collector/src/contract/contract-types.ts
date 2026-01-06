import type { BaseAgentContract, JsonRecord } from "@codeai-hub/agent-shared";

/**
 * Questionnaire configuration for Idea Collector.
 */
export type IdeaQuestionnaireConfig = {
  readonly templateMarkdown: string;
};

/**
 * Output paths for Idea Collector artifacts.
 */
export type IdeaOutputPaths = {
  readonly idea: string;
  readonly virtualSimulation: string;
};

/**
 * Contract payload for Idea Collector agent.
 * Contains all data needed to run the Idea Collector stage.
 */
export type IdeaContractPayload = BaseAgentContract & {
  readonly schema: JsonRecord;
  readonly questionnaire: IdeaQuestionnaireConfig;
  readonly outputPaths: IdeaOutputPaths;
};
