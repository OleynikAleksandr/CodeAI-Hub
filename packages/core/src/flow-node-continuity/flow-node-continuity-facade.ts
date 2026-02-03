import type {
  FlowNodeContinuityTemplateId,
  FlowNodeContinuityTemplateVariables,
} from "./flow-node-continuity-types";
import { TemplateLoader } from "./template-loader";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type FlowNodeContinuityFacadeOptions = {
  readonly templatesDir: string;
};

export class FlowNodeContinuityFacade {
  readonly #templateLoader: TemplateLoader;

  constructor(options: FlowNodeContinuityFacadeOptions) {
    this.#templateLoader = new TemplateLoader({
      templatesDir: options.templatesDir,
    });
  }

  loadTemplate(templateId: FlowNodeContinuityTemplateId): string {
    return this.#templateLoader.load(templateId);
  }

  renderTemplate(
    templateId: FlowNodeContinuityTemplateId,
    variables: FlowNodeContinuityTemplateVariables
  ): string {
    let content = this.loadTemplate(templateId);
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(
        new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, "g"),
        value
      );
    }
    return content;
  }
}
