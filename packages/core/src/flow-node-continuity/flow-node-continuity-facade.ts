import type {
  FlowNodeContinuityRolloverFilter,
  FlowNodeContinuityTemplateId,
  FlowNodeContinuityTemplateVariables,
} from "./flow-node-continuity-types";
import { FLOW_NODE_CONTINUITY_MVP_FILTER } from "./flow-node-continuity-types";
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
  readonly #filter: FlowNodeContinuityRolloverFilter;

  constructor(options: FlowNodeContinuityFacadeOptions) {
    this.#templateLoader = new TemplateLoader({
      templatesDir: options.templatesDir,
    });
    this.#reportWaiter = new ContinuityReportWaiter(options.clock);
    this.#filter = FLOW_NODE_CONTINUITY_MVP_FILTER;
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

  isEligibleForRollover(options: {
    readonly stageId: string | null;
    readonly runSlug: string | null;
  }): boolean {
    return (
      options.stageId === this.#filter.stageId &&
      options.runSlug === this.#filter.runSlug
    );
  }
}
