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

  loadTemplate(templateId: string): string {
    return this.#templateLoader.load(templateId);
  }

  renderTemplate(
    templateId: string,
    variables: Readonly<Record<string, string>>
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
