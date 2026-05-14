import type {
  FlowNodeContinuityRecoveryMode,
  FlowNodeContinuityTemplateId,
  FlowNodeContinuityTemplateVariables,
} from "./flow-node-continuity-types";
import {
  FLOW_NODE_CONTINUITY_TECHNICAL_STAGE_IDS,
  FLOW_NODE_CONTINUITY_TRUNK_STAGE_IDS,
} from "./flow-node-continuity-types";
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
  readonly #preemptRemainingPercentThreshold: number;

  constructor(options: FlowNodeContinuityFacadeOptions) {
    this.#templateLoader = new TemplateLoader({
      templatesDir: options.templatesDir,
    });
    this.#reportWaiter = new ContinuityReportWaiter(options.clock);
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
      options.stageId !== null &&
      options.runSlug === null &&
      (this.isTrunkDocumentationStage(options.stageId) ||
        this.isTechnicalFilesystemStage(options.stageId))
    );
  }

  resolveRecoveryMode(options: {
    readonly stageId: string | null;
  }): FlowNodeContinuityRecoveryMode {
    return options.stageId !== null &&
      this.isTechnicalFilesystemStage(options.stageId)
      ? "technical_workspace"
      : "continuity_report";
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

  private isTechnicalFilesystemStage(stageId: string): boolean {
    return FLOW_NODE_CONTINUITY_TECHNICAL_STAGE_IDS.includes(
      stageId as (typeof FLOW_NODE_CONTINUITY_TECHNICAL_STAGE_IDS)[number]
    );
  }

  private isTrunkDocumentationStage(stageId: string): boolean {
    return FLOW_NODE_CONTINUITY_TRUNK_STAGE_IDS.includes(
      stageId as (typeof FLOW_NODE_CONTINUITY_TRUNK_STAGE_IDS)[number]
    );
  }
}
