import type {
  FlowNodeContinuityTemplateId,
  FlowNodeContinuityTemplateVariables,
} from "./flow-node-continuity-types";
import type { ContinuityReportPaths } from "./report-path";
import { buildContinuityReportPaths } from "./report-path";
import type { WaitForReportResult } from "./report-waiter";
import { ContinuityReportWaiter } from "./report-waiter";
import { TemplateLoader } from "./template-loader";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type FlowNodeContinuityFacadeOptions = {
  readonly templatesDir: string;
  readonly clock?: () => number;
};

export class FlowNodeContinuityFacade {
  readonly #templateLoader: TemplateLoader;
  readonly #reportWaiter: ContinuityReportWaiter;

  constructor(options: FlowNodeContinuityFacadeOptions) {
    this.#templateLoader = new TemplateLoader({
      templatesDir: options.templatesDir,
    });
    this.#reportWaiter = new ContinuityReportWaiter(options.clock);
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

  buildReportPaths(options: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
    readonly nodeId: string;
    readonly role: string;
    readonly providerId: string;
    readonly timestamp: string;
  }): ContinuityReportPaths {
    return buildContinuityReportPaths(options);
  }

  waitForReport(options: {
    readonly reportPath: string;
    readonly timeoutMs: number;
    readonly pollIntervalMs: number;
  }): Promise<WaitForReportResult> {
    return this.#reportWaiter.waitForReport(options);
  }
}
