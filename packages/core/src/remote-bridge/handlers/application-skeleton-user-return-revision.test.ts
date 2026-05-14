import assert from "node:assert/strict";
import test from "node:test";
import { runApplicationSkeletonRevisionInjection } from "./application-skeleton-revision-injection-runner";

test("Application Skeleton user-return revision injection is disabled during managed rewrite", async () => {
  const warnings: string[] = [];
  await runApplicationSkeletonRevisionInjection({
    logger: {
      info: () => undefined,
      warn: (message) => {
        warnings.push(message);
      },
    },
    sessionId: "application-skeleton-session",
    stage: "application_skeleton",
    workspaceRoot: "/tmp/workspace",
  });

  assert.deepEqual(warnings, [
    "Application Skeleton revision injection is disabled while the managed workflow orchestration cluster is being rewritten.",
  ]);
});
