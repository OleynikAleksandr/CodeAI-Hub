/**
 * Idea Contract Service.
 *
 * This module re-exports the IdeaCollectorFacade for building Idea Collector contracts.
 * All logic has been migrated to @codeai-hub/idea-collector package.
 */

import { IdeaCollectorFacade } from "@codeai-hub/idea-collector";

export type { IdeaContractPayload } from "@codeai-hub/idea-collector";

/**
 * Build the complete contract for Idea Collector agent.
 * Delegates to IdeaCollectorFacade.buildContract().
 *
 * @returns Contract payload or null if required template files are missing
 */
export const buildIdeaContract = IdeaCollectorFacade.buildContract;
