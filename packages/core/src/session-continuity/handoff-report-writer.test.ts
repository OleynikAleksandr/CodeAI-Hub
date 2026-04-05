import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildHandoffReportPath,
  writeHandoffReport,
} from "./handoff-report-writer";

test("handoff report paths use the canonical application foundation envelope continuity folder", async () => {
  const workspaceRoot = mkdtempSync(
    path.join(os.tmpdir(), "application-foundation-envelope-handoff-")
  );
  const expectedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "continuity",
    "application_foundation_envelope",
    "root-session",
    "2026-04-05T12-45-00.000Z",
    "handoff-report.md"
  );

  assert.equal(
    buildHandoffReportPath({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      stageId: "application_foundation_envelope",
      rootSessionId: "root-session",
      timestamp: "2026-04-05T12-45-00.000Z",
    }),
    expectedPath
  );

  const filePath = await writeHandoffReport({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    stageId: "application_foundation_envelope",
    rootSessionId: "root-session",
    timestamp: "2026-04-05T12-45-00.000Z",
    content: "# Handoff Report\n\nReady.\n",
  });

  assert.equal(filePath, expectedPath);
  assert.equal(existsSync(expectedPath), true);
  assert.equal(
    existsSync(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        "demo-workspace",
        "continuity",
        "unknown",
        "root-session",
        "2026-04-05T12-45-00.000Z",
        "handoff-report.md"
      )
    ),
    false
  );
});
