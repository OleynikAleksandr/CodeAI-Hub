import type { Request, Response } from "express";
import type { Logger } from "../../telemetry/logger";
import type { WorkflowWatcherEvent } from "../../workflow/watcher/watcher-types";

export type WorkflowFeedEvent = WorkflowWatcherEvent;

const HTTP_BAD_REQUEST = 400;
const MAX_EVENTS = 200;

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseSinceTimestamp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString();
};

export class WorkflowEventsService {
  private readonly logger: Logger;
  private readonly events = new Map<string, WorkflowFeedEvent[]>();

  constructor(options: { readonly logger: Logger }) {
    this.logger = options.logger;
  }

  record(event: WorkflowWatcherEvent): void {
    this.appendEvent(event);
    this.logger.debug("Recorded workflow event in workflow feed", {
      stage: event.stage,
      type: event.type,
      workspaceSlug: event.workspaceSlug,
    });
  }

  handleWorkflowEventsRead(req: Request, res: Response): void {
    const query = req.query as Record<string, unknown>;
    const workspaceSlug = readNonEmptyString(query.workspaceSlug);
    if (!workspaceSlug) {
      res.status(HTTP_BAD_REQUEST).json({ error: "Missing workspaceSlug" });
      return;
    }

    const since = parseSinceTimestamp(readNonEmptyString(query.since));
    const events = this.filterEvents(workspaceSlug, since);
    res.json({ events, nextCursor: events.at(-1)?.timestamp ?? null });
  }

  private appendEvent(event: WorkflowFeedEvent): void {
    const list = this.events.get(event.workspaceSlug) ?? [];
    const next = [...list, event].slice(-MAX_EVENTS);
    this.events.set(event.workspaceSlug, next);
  }

  private filterEvents(
    workspaceSlug: string,
    since: string | null
  ): WorkflowFeedEvent[] {
    const list = this.events.get(workspaceSlug) ?? [];
    if (!since) {
      return list;
    }
    return list.filter((event) => event.timestamp > since);
  }
}
