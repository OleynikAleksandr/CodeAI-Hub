import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../telemetry/logger";
import type { BundledTemplateSource } from "./bundled-templates";
import { TemplateSyncService } from "./template-sync-service";
import { TemplateUpdateResolutionService } from "./template-update-resolution-service";

const TEST_TEMPLATE_PATH =
  ".codeai-hub/templates/invocation/codex/workflow-agent.system.md";

const encodeTemplateContent = (content: string): string =>
  Buffer.from(content, "utf8").toString("base64");

const createTestTemplateSource = (content: string): BundledTemplateSource => ({
  id: "test-template",
  audience: "internal_agent_instructions",
  destinationRelativePath: TEST_TEMPLATE_PATH,
  base64: encodeTemplateContent(content),
});

const withTempHome = async (run: (tempHome: string) => Promise<void>) => {
  const tempHome = await mkdtemp(path.join(os.tmpdir(), "template-resolve-"));
  const previousHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    await run(tempHome);
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
};

const createPendingUpdate = async (tempHome: string) => {
  const destinationPath = path.join(tempHome, TEST_TEMPLATE_PATH);
  await new TemplateSyncService(new Logger("error"), {
    sources: [createTestTemplateSource("bundled v1")],
    syncVersion: "1.2.98-test",
  }).sync();
  await writeFile(destinationPath, "user custom instructions\n", "utf8");
  await new TemplateSyncService(new Logger("error"), {
    sources: [createTestTemplateSource("bundled v2")],
    syncVersion: "1.2.99-test",
  }).sync();
  return destinationPath;
};

test("TemplateUpdateResolutionService backup-and-replace keeps backup and clears pending update", async () => {
  await withTempHome(async (tempHome) => {
    const destinationPath = await createPendingUpdate(tempHome);
    const service = new TemplateUpdateResolutionService(new Logger("error"));

    assert.equal((await service.listPendingUpdates()).length, 1);

    const result = await service.resolvePendingUpdate({
      id: "test-template",
      action: "backup-and-replace",
    });

    assert.equal(result.status, "resolved");
    assert.equal(await readFile(destinationPath, "utf8"), "bundled v2\n");
    assert.equal(result.pendingUpdates.length, 0);
    assert.equal(
      result.backupPath ? await readFile(result.backupPath, "utf8") : null,
      "user custom instructions\n"
    );
  });
});

test("TemplateUpdateResolutionService preserve-current dismisses the same incoming hash", async () => {
  await withTempHome(async (tempHome) => {
    const destinationPath = await createPendingUpdate(tempHome);
    const incomingPath = path.join(
      tempHome,
      ".codeai-hub/templates/.incoming/1.2.99-test/invocation/codex/workflow-agent.system.md"
    );
    const service = new TemplateUpdateResolutionService(new Logger("error"));

    const result = await service.resolvePendingUpdate({
      id: "test-template",
      action: "preserve-current",
    });

    assert.equal(result.status, "resolved");
    assert.equal(
      await readFile(destinationPath, "utf8"),
      "user custom instructions\n"
    );
    await assert.rejects(access(incomingPath));

    await new TemplateSyncService(new Logger("error"), {
      sources: [createTestTemplateSource("bundled v2")],
      syncVersion: "1.2.99-test",
    }).sync();

    assert.equal((await service.listPendingUpdates()).length, 0);
  });
});
