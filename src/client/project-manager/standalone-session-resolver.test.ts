import assert from "node:assert/strict";
import test from "node:test";
import type { SessionRecord } from "../../types/session";
import {
  findPendingStandaloneSessionId,
  isPendingSessionMatch,
  type PendingStandaloneSession,
} from "./standalone-session-resolver";

const pending: PendingStandaloneSession = {
  createdAfter: Date.parse("2026-06-21T17:00:00.000Z"),
  pending: true,
  providerId: "codexCli",
  providerSessionId: null,
};

const session: SessionRecord = {
  binding: { providerSessionId: null, status: "pending" },
  createdAt: Date.parse("2026-06-21T17:00:01.000Z"),
  id: "session-1",
  initiativeSlug: null,
  providerIds: ["codexCli"],
  runSlug: null,
  stage: null,
  title: "Standalone chat",
  workspacePath: "/tmp/workspace",
};

test("pending standalone session match accepts normalized Core session records", () => {
  assert.equal(
    isPendingSessionMatch({
      pending,
      session,
      workspacePath: "/tmp/workspace",
    }),
    true
  );
});

test("pending standalone chat lookup picks the created live session", () => {
  assert.equal(
    findPendingStandaloneSessionId({
      pending,
      chats: [
        {
          createdAt: "2026-06-21T16:59:59.000Z",
          liveSessionId: "old-session",
          providerId: "codexCli",
          providerSessionId: "old-provider-session",
        },
        {
          createdAt: "2026-06-21T17:00:01.000Z",
          liveSessionId: "session-1",
          providerId: "codexCli",
          providerSessionId: "new-provider-session",
        },
      ],
    }),
    "session-1"
  );
});
