import type { BaseAgentContract, JsonRecord } from "@codeai-hub/agent-shared";

/**
 * Output paths for Spec Creator artifacts.
 */
export type SpecOutputPaths = {
  readonly specification: string;
  readonly technicalDesign: string;
};

/**
 * Contract payload for Spec Creator agent.
 * Contains all data needed to run the Specification stage.
 */
export type SpecContractPayload = BaseAgentContract & {
  readonly schema: JsonRecord;
  readonly outputPaths: SpecOutputPaths;
  /**
   * Input from previous stage (Idea Collector).
   */
  readonly ideaContext?: string;
};
