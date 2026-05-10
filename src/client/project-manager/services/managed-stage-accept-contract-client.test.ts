import assert from "node:assert/strict";
import test from "node:test";
import { acceptApplicationSkeletonContract } from "./managed-stage-accept-contract-client";

const buildFetch = (
  recorded: Array<{ readonly body: unknown; readonly url: string }>,
  response: { readonly body: unknown; readonly ok: boolean }
): typeof fetch =>
  ((url: string, init?: { body?: string }) => {
    recorded.push({
      body: init?.body ? JSON.parse(init.body) : null,
      url,
    });
    return Promise.resolve({
      json: () => Promise.resolve(response.body),
      ok: response.ok,
    } as Response);
  }) as unknown as typeof fetch;

test("client posts to the managed-stage-accept-contract endpoint", async () => {
  const recorded: Array<{ body: unknown; url: string }> = [];
  await acceptApplicationSkeletonContract(
    { sessionId: "session-1" },
    buildFetch(recorded, { body: { status: "accepted" }, ok: true })
  );
  assert.equal(recorded[0]?.url, "/api/v1/orchestrator/managed-stage-accept-contract");
  assert.deepEqual(recorded[0]?.body, {
    sessionId: "session-1",
    source: "ui-button",
  });
});

test("client returns accepted decision when server reports ok + accepted", async () => {
  const decision = await acceptApplicationSkeletonContract(
    { sessionId: "session-1" },
    buildFetch([], { body: { status: "accepted" }, ok: true })
  );
  assert.equal(decision.kind, "accepted");
});

test("client surfaces server-provided rejection reasons", async () => {
  const decision = await acceptApplicationSkeletonContract(
    { sessionId: "session-1" },
    buildFetch([], {
      body: {
        error: "rejected",
        reasons: ["draft incomplete", "git not clean"],
      },
      ok: false,
    })
  );
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.deepEqual(decision.reasons, ["draft incomplete", "git not clean"]);
  }
});

test("client falls back to a generic rejection reason when the server payload is malformed", async () => {
  const decision = await acceptApplicationSkeletonContract(
    { sessionId: "session-1" },
    buildFetch([], { body: { unexpected: true }, ok: false })
  );
  assert.equal(decision.kind, "rejected");
  if (decision.kind === "rejected") {
    assert.equal(decision.reasons.length, 1);
  }
});

test("client honours an explicit typed-fallback source", async () => {
  const recorded: Array<{ body: unknown; url: string }> = [];
  await acceptApplicationSkeletonContract(
    { sessionId: "session-1", source: "typed-fallback" },
    buildFetch(recorded, { body: { status: "accepted" }, ok: true })
  );
  const body = recorded[0]?.body as { source?: string } | null;
  assert.equal(body?.source, "typed-fallback");
});
