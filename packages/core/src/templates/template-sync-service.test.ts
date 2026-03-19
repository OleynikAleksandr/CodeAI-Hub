import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../telemetry/logger";
import { TemplateSyncService } from "./template-sync-service";

const LEGACY_DIAGRAM_TEMPLATE_PATHS = [
  ".codeai-hub/templates/diagram_modules/modules-diagram-prompt.md",
  ".codeai-hub/templates/diagram_modules/modules-diagram-template.mmd",
  ".codeai-hub/templates/diagram_facades/facades-graph-prompt.md",
  ".codeai-hub/templates/diagram_facades/facades-graph-template.mmd",
] as const;

const VISIBLE_DIAGRAM_TEMPLATE_PATHS = [
  ".codeai-hub/templates/diagram_modules/module-inventory-prompt.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-template.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-field-reference.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-merge-rules.md",
  ".codeai-hub/templates/diagram_facades/facade-map-prompt.md",
  ".codeai-hub/templates/diagram_facades/facade-map-template.md",
  ".codeai-hub/templates/diagram_facades/facade-map-field-reference.md",
  ".codeai-hub/templates/diagram_facades/facade-map-merge-rules.md",
] as const;

test("TemplateSyncService removes legacy diagram templates during sync", async () => {
  const tempHome = await mkdtemp(path.join(os.tmpdir(), "template-sync-"));
  const previousHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    for (const relativePath of LEGACY_DIAGRAM_TEMPLATE_PATHS) {
      const absolutePath = path.join(tempHome, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, "legacy", "utf8");
    }

    const service = new TemplateSyncService(new Logger("error"));
    await service.sync();

    for (const relativePath of LEGACY_DIAGRAM_TEMPLATE_PATHS) {
      const absolutePath = path.join(tempHome, relativePath);
      await assert.rejects(access(absolutePath));
    }
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});

test("TemplateSyncService installs visible diagram templates for appendix resolution", async () => {
  const tempHome = await mkdtemp(path.join(os.tmpdir(), "template-sync-"));
  const previousHome = process.env.HOME;
  process.env.HOME = tempHome;

  try {
    const service = new TemplateSyncService(new Logger("error"));
    await service.sync();

    for (const relativePath of VISIBLE_DIAGRAM_TEMPLATE_PATHS) {
      const absolutePath = path.join(tempHome, relativePath);
      await assert.doesNotReject(access(absolutePath));
    }
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});
