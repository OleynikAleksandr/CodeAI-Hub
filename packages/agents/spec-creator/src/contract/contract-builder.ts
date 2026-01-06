import { computeVersionHash, readTextFromFile } from "@codeai-hub/agent-shared";
import { SPEC_OUTPUT_PATHS, SPEC_TEMPLATE_PATHS } from "../paths";
import type { SpecContractPayload } from "./contract-types";

/**
 * Build the complete contract for Spec Creator agent.
 *
 * TODO: Implement full contract building logic when assets are ready.
 * Currently returns a skeleton contract for development purposes.
 *
 * @returns Contract payload or null if required files are missing
 */
export const buildSpecContract =
  async (): Promise<SpecContractPayload | null> => {
    // Read template files
    const promptContent = await readTextFromFile(SPEC_TEMPLATE_PATHS.prompt);
    const schemaContent = await readTextFromFile(SPEC_TEMPLATE_PATHS.schema);
    const templateContent = await readTextFromFile(
      SPEC_TEMPLATE_PATHS.template
    );

    // If any required file is missing, return null
    if (!(promptContent && schemaContent && templateContent)) {
      return null;
    }

    // Parse schema JSON
    let schema: Record<string, unknown>;
    try {
      schema = JSON.parse(schemaContent) as Record<string, unknown>;
    } catch {
      return null;
    }

    // Compute version hash from all inputs
    const versionHash = computeVersionHash([
      promptContent,
      schemaContent,
      templateContent,
    ]);

    return {
      prompt: promptContent,
      template: templateContent,
      schema,
      outputPaths: SPEC_OUTPUT_PATHS,
      version: versionHash,
    };
  };
