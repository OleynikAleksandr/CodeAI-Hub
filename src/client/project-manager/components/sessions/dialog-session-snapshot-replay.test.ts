import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SessionMessage } from "../../../../types/session";

const CONTROLLER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts"
);

const CORE_EVENTS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts"
);
const DIALOG_HELPERS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.ts"
);
const RUNTIME_RESOLVER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts"
);

type ConvertHistoryToMessages =
  typeof import("./project-manager-dialog-session-view-helpers")["convertHistoryToMessages"];

let convertHistoryToMessagesLoader: Promise<ConvertHistoryToMessages> | null =
  null;
const loadConvertHistoryToMessages =
  async (): Promise<ConvertHistoryToMessages> => {
    if (!convertHistoryToMessagesLoader) {
      convertHistoryToMessagesLoader = import(
        "./project-manager-dialog-session-view-helpers"
      ).then((module) => module.convertHistoryToMessages);
    }
    return convertHistoryToMessagesLoader;
  };

test("dialog session controller caches workspace snapshots for replay", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      "const latestWorkspaceSnapshotRef = useRef<WorkspaceSnapshotPushPayload | null>("
    ),
    true,
    "controller must keep last workspace snapshot to avoid race with dialog:list:result/session:created"
  );
  assert.equal(
    source.includes("latestWorkspaceSnapshotRef.current = payload;"),
    true,
    "controller must record latest workspace snapshot payload"
  );
  assert.equal(
    source.includes("latestWorkspaceSnapshotRef,"),
    true,
    "controller must pass latest snapshot ref into dialog core events"
  );
});

test("dialog core events replay workspace snapshot after creating base snapshot", async () => {
  const source = await readFile(CORE_EVENTS_SOURCE_PATH, "utf8");
  const resolverSource = await readFile(RUNTIME_RESOLVER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("options.latestWorkspaceSnapshotRef.current"),
    true,
    "dialog core events must consult latest workspace snapshot ref"
  );
  assert.equal(
    source.includes("applyWorkspaceSnapshotToSnapshots"),
    true,
    "dialog core events must replay lock state from workspace snapshot"
  );
  assert.equal(
    source.includes("resolveRuntimeSessionFromWorkspaceSnapshot"),
    true,
    "dialog core events must resolve runtime sessionId against latest workspace snapshot"
  );
  assert.equal(
    resolverSource.includes("session.providerSessionId === options.providerSessionId"),
    true,
    "runtime session fallback must support providerSessionId identity when session ids drift"
  );
});

test("dialog core events ensure resumed dialogs have a runtime session for snapshots", async () => {
  const source = await readFile(CORE_EVENTS_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("api.createSession({"),
    true,
    "dialog open must request runtime session creation so lock/timers hydrate after cold start"
  );
  assert.equal(
    source.includes("resolveRuntimeSessionFromWorkspaceSnapshot"),
    true,
    "dialog open should consult workspace snapshots to detect missing runtime sessions"
  );
  assert.equal(
    source.includes("match.providerSessionId"),
    true,
    "dialog open must resume provider sessions using providerSessionId identity"
  );
  assert.equal(
    source.includes("!runtimeSession.hasRuntimeSession"),
    true,
    "dialog open should request runtime resume when snapshot lacks runtime session"
  );
});

test("dialog history helpers preserve assistant and thinking records for replay", async () => {
  const convertHistoryToMessages = await loadConvertHistoryToMessages();
  const messages = convertHistoryToMessages([
    {
      messageId: "assistant-1",
      role: "assistant",
      content: "progress update",
      timestamp: "2026-03-06T09:00:00.000Z",
    },
    {
      messageId: "thinking-1",
      role: "thinking",
      content: "internal reasoning summary",
      timestamp: "2026-03-06T09:00:01.000Z",
    },
  ]);

  assert.deepEqual(
    messages.map((message: SessionMessage) => message.role),
    ["assistant", "thinking"],
    "dialog history replay must preserve assistant and thinking roles from JSONL"
  );
});

test("dialog core events refresh dialog history after live dialog message", async () => {
  const [coreEventsSource, helpersSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(DIALOG_HELPERS_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    coreEventsSource.includes('if (message.type === "dialog:message") {'),
    true,
    "dialog core events must listen to live dialog message notifications"
  );
  assert.equal(
    coreEventsSource.includes(
      "options.requestDialogHistory(intent, incomingDialogId, cursor, { force: cursor <= 0 });"
    ),
    true,
    "live dialog message must trigger history refresh from JSONL instead of relying on runtime session messages"
  );
  assert.equal(
    helpersSource.includes('role !== "thinking"'),
    true,
    "dialog history sanitizer must continue accepting thinking role"
  );
});

test("dialog first-open hydration binds session identity before requesting history", async () => {
  const [controllerSource, coreEventsSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    controllerSource.includes("sessionRef.current = null;"),
    true,
    "controller must clear session ref on intent switch to avoid stale first-open routing"
  );

  const sessionRefBindIndex = coreEventsSource.indexOf(
    "options.sessionRef.current = nextSession;"
  );
  const firstHistoryRequestIndex = coreEventsSource.indexOf(
    "options.requestDialogHistory(intent, match.dialogId);"
  );
  assert.equal(
    sessionRefBindIndex >= 0 && firstHistoryRequestIndex > sessionRefBindIndex,
    true,
    "dialog list handler must bind sessionRef before the first history request"
  );
});

test("dialog controller retries stalled cold-open history request after timeout", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("window.setTimeout(() => {"),
    true,
    "controller must schedule watchdog timeout for cold-open history"
  );
  assert.equal(
    source.includes("pendingHistoryCursorRef.current.has(dialogId)"),
    true,
    "watchdog must verify request is still pending before retry"
  );
  assert.equal(
    source.includes("loadedDialogIdsRef.current.delete(dialogId);"),
    true,
    "watchdog must clear loaded marker before forced retry"
  );
  assert.equal(
    source.includes("requestDialogHistory(activeIntent, dialogId, 0, { force: true });"),
    true,
    "watchdog must issue a forced full-history retry for stalled cold-open"
  );
});
