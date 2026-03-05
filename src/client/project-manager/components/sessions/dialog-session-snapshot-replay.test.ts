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
