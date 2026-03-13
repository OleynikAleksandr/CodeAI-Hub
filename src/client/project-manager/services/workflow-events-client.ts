const WORKFLOW_EVENTS_ENDPOINT = "/api/v1/orchestrator/workflow-events";

export type WorkflowEvent = {
  readonly type: string;
  readonly timestamp: string;
  readonly workspaceSlug: string;
  readonly stage?: string;
  readonly filePath?: string;
  readonly gateId?: string;
  readonly detail?: string;
};

type WorkflowEventsResponse = {
  readonly events?: readonly WorkflowEvent[];
  readonly nextCursor?: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const joinUrl = (baseUrl: string, path: string): string => {
  const normalizedBaseUrl = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${normalizedBaseUrl}${path}`;
};

const normalizeEvent = (event: unknown): WorkflowEvent | null => {
  if (!isRecord(event)) {
    return null;
  }
  const type = readNonEmptyString(event.type);
  const timestamp = readNonEmptyString(event.timestamp);
  const workspaceSlug = readNonEmptyString(event.workspaceSlug);
  if (!(type && timestamp && workspaceSlug)) {
    return null;
  }
  return {
    type,
    timestamp,
    workspaceSlug,
    stage: readNonEmptyString(event.stage ?? undefined) ?? undefined,
    filePath: readNonEmptyString(event.filePath ?? undefined) ?? undefined,
    gateId: readNonEmptyString(event.gateId ?? undefined) ?? undefined,
    detail: readNonEmptyString(event.detail ?? undefined) ?? undefined,
  };
};

const parseEventsResponse = (payload: unknown): WorkflowEventsResponse | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const events = Array.isArray(payload.events)
    ? payload.events.map(normalizeEvent).filter((event): event is WorkflowEvent =>
        Boolean(event)
      )
    : undefined;
  const nextCursor = readNonEmptyString(payload.nextCursor ?? undefined);
  return { events, nextCursor };
};

export const startWorkflowEventPolling = (params: {
  readonly httpUrl: string;
  readonly workspaceSlug: string;
  readonly onEvents: (events: readonly WorkflowEvent[]) => void;
  readonly intervalMs?: number;
}): (() => void) => {
  let stopped = false;
  let cursor: string | null = null;
  const intervalMs = params.intervalMs ?? 10_000;

  const fetchEvents = async () => {
    if (stopped) {
      return;
    }
    const query = cursor
      ? `?workspaceSlug=${encodeURIComponent(params.workspaceSlug)}&since=${encodeURIComponent(
          cursor
        )}`
      : `?workspaceSlug=${encodeURIComponent(params.workspaceSlug)}`;
    try {
      const response = await fetch(joinUrl(params.httpUrl, `${WORKFLOW_EVENTS_ENDPOINT}${query}`));
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as unknown;
      const parsed = parseEventsResponse(payload);
      if (!parsed) {
        return;
      }
      const events = parsed.events ?? [];
      if (events.length > 0) {
        params.onEvents(events);
      }
      cursor = parsed.nextCursor ?? cursor;
    } catch {
      // Ignore polling errors; next tick will retry.
    }
  };

  fetchEvents();
  const timer = window.setInterval(fetchEvents, intervalMs);

  return () => {
    stopped = true;
    window.clearInterval(timer);
  };
};
