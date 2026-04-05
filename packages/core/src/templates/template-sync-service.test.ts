import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
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
  ".codeai-hub/templates/diagram_modules/diagram-modules-prompt.md",
  ".codeai-hub/templates/diagram_modules/product-parts-index-template.md",
  ".codeai-hub/templates/diagram_modules/product-part-template.md",
  ".codeai-hub/templates/diagram_modules/diagram-modules-field-reference.md",
  ".codeai-hub/templates/diagram_modules/diagram-modules-merge-rules.md",
] as const;

const POLYGON_TEMPLATE_CONTENT_CHECKS = [
  {
    relativePath:
      ".codeai-hub/templates/description/description-collector-prompt.md",
    snippets: [
      "All products in CodeAI Hub are interpreted as cluster-module systems by default",
      "Your task in this step is to build and iteratively refine `Final_Description.md`",
      "the document must contain a separate section on the level of `## Key User Scenarios`",
    ],
  },
  {
    relativePath: ".codeai-hub/templates/description/questionnaire-template.md",
    snippets: [
      "We recommend describing the future product in a cluster-module architecture mindset.",
      "## 2. Product Type / Platform",
      "## 12. Notes",
    ],
  },
  {
    relativePath: ".codeai-hub/templates/description/description-template.md",
    snippets: [
      "the key usage scenarios without an artificial limit",
      "After that, the AI provider picker will open",
      "the provider is chosen once for the whole workflow workspace",
      "a dedicated block of key user scenarios",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/virtual_simulation/virtual-simulation-prompt.md",
    snippets: [
      "Archetype / shell constraints",
      "Candidate clusters and standalone modules",
      "The scenarios from the questionnaire and `Final_Description.md` are only the starting baseline",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/diagram-modules-prompt.md",
    snippets: [
      "formal subsystem container",
      "keep `Product Part`, `Cluster`, and `Module` names/titles in canonical English",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/product-parts-index-template.md",
    snippets: [
      "# Product Parts Index",
      "- Status: planned",
      "Keep Product Part names/titles",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/product-part-template.md",
    snippets: [
      "# Product Part:",
      "File materializes exactly one Product Part",
      "Keep Product Part, Cluster, and Module names/titles in canonical English.",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/diagram-modules-field-reference.md",
    snippets: [
      "The staged artifacts for this step consist of:",
      "the canonical English name of the top-level product block",
      "## Simple Relations (inside the product-part file)",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/diagram-modules-merge-rules.md",
    snippets: [
      "When the runtime provides a change summary:",
      "do not silently convert standalone modules into cluster members",
    ],
  },
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

    for (const check of POLYGON_TEMPLATE_CONTENT_CHECKS) {
      const absolutePath = path.join(tempHome, check.relativePath);
      const content = await readFile(absolutePath, "utf8");
      for (const snippet of check.snippets) {
        assert.equal(content.includes(snippet), true);
      }
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
