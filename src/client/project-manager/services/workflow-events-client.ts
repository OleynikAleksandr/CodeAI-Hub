const WORKFLOW_EVENTS_ENDPOINT = "/api/v1/orchestrator/workflow-events";
const BACKGROUND_POLL_MS = 30_000;

type WorkflowEventsPollingMode = "foreground" | "background" | "hidden";

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
  readonly getForegroundIntervalMs?: () => number;
}): (() => void) => {
  let stopped = false;
  let cursor: string | null = null;
  let timer = 0;
  let pollInFlight = false;
  let pendingImmediatePoll = false;
  let pollingMode: WorkflowEventsPollingMode = "foreground";

  const resolvePollingMode = (): WorkflowEventsPollingMode => {
    if (typeof document === "undefined") {
      return "foreground";
    }
    if (document.visibilityState !== "visible") {
      return "hidden";
    }
    return document.hasFocus() ? "foreground" : "background";
  };

  const resolveIntervalMs = (): number | null => {
    if (pollingMode === "hidden") {
      return null;
    }
    if (pollingMode === "background") {
      return BACKGROUND_POLL_MS;
    }
    return params.getForegroundIntervalMs?.() ?? params.intervalMs ?? 10_000;
  };

  const scheduleNextPoll = () => {
    window.clearTimeout(timer);
    timer = 0;
    const intervalMs = resolveIntervalMs();
    if (stopped || intervalMs === null) {
      return;
    }
    timer = window.setTimeout(() => {
      void fetchEvents();
    }, intervalMs);
  };

  const requestImmediatePoll = () => {
    window.clearTimeout(timer);
    timer = 0;
    if (stopped || resolveIntervalMs() === null) {
      return;
    }
    if (pollInFlight) {
      pendingImmediatePoll = true;
      return;
    }
    void fetchEvents();
  };

  const fetchEvents = async () => {
    if (stopped || resolveIntervalMs() === null) {
      return;
    }
    pollInFlight = true;
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
    } finally {
      pollInFlight = false;
      if (stopped) {
        return;
      }
      if (pendingImmediatePoll && resolveIntervalMs() !== null) {
        pendingImmediatePoll = false;
        void fetchEvents();
        return;
      }
      pendingImmediatePoll = false;
      scheduleNextPoll();
    }
  };

  const handleActivityChange = () => {
    const nextMode = resolvePollingMode();
    if (nextMode === pollingMode) {
      return;
    }
    pollingMode = nextMode;
    if (pollingMode === "foreground") {
      requestImmediatePoll();
      return;
    }
    pendingImmediatePoll = false;
    scheduleNextPoll();
  };

  pollingMode = resolvePollingMode();
  if (resolveIntervalMs() !== null) {
    requestImmediatePoll();
  }
  window.addEventListener("focus", handleActivityChange);
  window.addEventListener("blur", handleActivityChange);
  document.addEventListener("visibilitychange", handleActivityChange);

  return () => {
    stopped = true;
    pendingImmediatePoll = false;
    window.clearTimeout(timer);
    timer = 0;
    window.removeEventListener("focus", handleActivityChange);
    window.removeEventListener("blur", handleActivityChange);
    document.removeEventListener("visibilitychange", handleActivityChange);
  };
};
