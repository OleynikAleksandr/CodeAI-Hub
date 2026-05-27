import assert from "node:assert/strict";
import test from "node:test";
import { SessionShellFactory } from "./session-shell-factory";

const createFactory = (): SessionShellFactory =>
  new SessionShellFactory(
    {} as ConstructorParameters<typeof SessionShellFactory>[0]
  );

test("SessionShellFactory broadcasts early shell sessions for new workflow stages", () => {
  const factory = createFactory();

  assert.equal(
    factory.shouldBroadcastCreatedEarly({
      context: {
        initiativeSlug: "demo",
        providerSessionId: null,
        runSlug: null,
        stage: "virtual_simulation",
      },
    } as Parameters<SessionShellFactory["shouldBroadcastCreatedEarly"]>[0]),
    true
  );
});

test("SessionShellFactory does not create an early shell for explicit provider resumes", () => {
  const factory = createFactory();

  assert.equal(
    factory.shouldBroadcastCreatedEarly({
      context: {
        initiativeSlug: "demo",
        providerSessionId: "provider-session",
        runSlug: null,
        stage: "virtual_simulation",
      },
    } as Parameters<SessionShellFactory["shouldBroadcastCreatedEarly"]>[0]),
    false
  );
});
