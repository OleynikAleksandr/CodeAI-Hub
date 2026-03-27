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

export interface FlowNodeContinuityFacadeOptions {
  readonly clock?: () => number;
  readonly preemptRemainingPercentThreshold: number;
  readonly templatesDir: string;
}

export class FlowNodeContinuityFacade {
  readonly #templateLoader: TemplateLoader;
  readonly #reportWaiter: ContinuityReportWaiter;
  readonly #filter: FlowNodeContinuityRolloverFilter;
  readonly #preemptRemainingPercentThreshold: number;

  constructor(options: FlowNodeContinuityFacadeOptions) {
    this.#templateLoader = new TemplateLoader({
      templatesDir: options.templatesDir,
    });
    this.#reportWaiter = new ContinuityReportWaiter(options.clock);
    this.#filter = FLOW_NODE_CONTINUITY_MVP_FILTER;
    this.#preemptRemainingPercentThreshold = Math.min(
      100,
      Math.max(0, Math.round(options.preemptRemainingPercentThreshold))
    );
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

  shouldStartSilentPreemptiveRollover(options: {
    readonly stageId: string | null;
    readonly runSlug: string | null;
    readonly remainingPercent: number;
  }): boolean {
    if (this.#preemptRemainingPercentThreshold <= 0) {
      return false;
    }
    if (
      !this.isEligibleForRollover({
        stageId: options.stageId,
        runSlug: options.runSlug,
      })
    ) {
      return false;
    }
    return options.remainingPercent <= this.#preemptRemainingPercentThreshold;
  }
}
