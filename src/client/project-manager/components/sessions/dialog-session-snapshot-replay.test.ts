import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const CONTROLLER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts"
);

const CORE_EVENTS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts"
);
const BOOTSTRAP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/dialog-session-bootstrap.ts"
);
const RUNTIME_RESOLVER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts"
);

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
  const [source, bootstrapSource, resolverSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(BOOTSTRAP_SOURCE_PATH, "utf8"),
    readFile(RUNTIME_RESOLVER_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    source.includes("createDialogBootstrapSnapshots"),
    true,
    "dialog core events must delegate bootstrap snapshot creation to helper"
  );
  assert.equal(
    bootstrapSource.includes("applyWorkspaceSnapshotToSnapshots"),
    true,
    "bootstrap helper must replay lock state from workspace snapshot"
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

test("dialog core events dedupe resumed dialog runtime restore requests", async () => {
  const [source, bootstrapSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(BOOTSTRAP_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    source.includes("buildDialogRestoreRequestKey"),
    true,
    "dialog open must build a restore request key per continuity entry"
  );
  assert.equal(
    source.includes("shouldCreateRuntimeRestore"),
    true,
    "dialog open must consult restore dedupe helper before createSession"
  );
  assert.equal(
    source.includes("options.restoreRequestInFlightRef.current"),
    true,
    "dialog open must track in-flight restore requests in a stable ref"
  );
  assert.equal(
    bootstrapSource.includes("RUNTIME_RESTORE_IN_FLIGHT_TTL_MS = 30_000"),
    true,
    "restore dedupe helper must expire stale requests after bounded TTL"
  );
  assert.equal(
    bootstrapSource.includes("options.requests.has(options.restoreKey)"),
    true,
    "restore dedupe helper must suppress duplicate restore requests for the same dialog continuity entry"
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

test("dialog controller keeps restore dedupe state across cold-open retries", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const restoreRequestInFlightRef = useRef(new Map<string, number>())"),
    true,
    "controller must keep restore request dedupe state across repeated dialog:list results"
  );
  assert.equal(
    source.includes("restoreRequestInFlightRef.current.clear();"),
    true,
    "controller must clear restore dedupe state when dialog intent changes"
  );
  assert.equal(
    source.includes("restoreRequestInFlightRef,"),
    true,
    "controller must pass restore dedupe ref into dialog core events"
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
