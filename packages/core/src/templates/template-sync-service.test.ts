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
  ".codeai-hub/templates/diagram_modules/module-inventory-prompt.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-template.md",
  ".codeai-hub/templates/diagram_modules/product-parts-index-template.md",
  ".codeai-hub/templates/diagram_modules/product-part-template.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-field-reference.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-merge-rules.md",
  ".codeai-hub/templates/diagram_facades/facade-map-prompt.md",
  ".codeai-hub/templates/diagram_facades/facade-map-template.md",
  ".codeai-hub/templates/diagram_facades/facade-map-field-reference.md",
  ".codeai-hub/templates/diagram_facades/facade-map-merge-rules.md",
] as const;

const POLYGON_TEMPLATE_CONTENT_CHECKS = [
  {
    relativePath:
      ".codeai-hub/templates/description/description-collector-prompt.md",
    snippets: [
      "Все продукты в CodeAI Hub по умолчанию трактуются как кластерно-модульные",
      "Твоя задача на этом шаге — на основе анкеты",
      "отдельный раздел уровня `## Ключевые пользовательские сценарии`",
    ],
  },
  {
    relativePath: ".codeai-hub/templates/description/questionnaire-template.md",
    snippets: [
      "Мы рекомендуем описывать будущий продукт в логике кластерно-модульной архитектуры",
      "Какой это тип продукта / платформа",
      "## 12. Примечания",
    ],
  },
  {
    relativePath: ".codeai-hub/templates/description/description-template.md",
    snippets: [
      "ключевые сценарии использования без жёсткого лимита",
      "После этого откроется выбор AI-провайдера",
      "провайдер выбирается один раз для всего workflow workspace",
      "отдельный блок ключевых пользовательских сценариев",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/virtual_simulation/virtual-simulation-prompt.md",
    snippets: [
      "Archetype / shell constraints",
      "Candidate clusters and standalone modules",
      "достаточное количество ключевых сценариев",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/module-inventory-prompt.md",
    snippets: [
      "formal subsystem container",
      ".codeai-hub/templates/diagram_modules/module-inventory-template.md",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/module-inventory-template.md",
    snippets: [
      "### Cluster: example-user-workspace",
      "#### Module: workspace-intake",
      "Этот inventory — semantic source of truth шага",
      "Оставляйте module standalone",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/product-parts-index-template.md",
    snippets: [
      "# Product Parts Index",
      "- Status: planned",
      "generation order",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/product-part-template.md",
    snippets: [
      "# Module Inventory",
      "This staged file should materialize exactly one Product Part.",
      "### Module: provider-session-bridge",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/module-inventory-field-reference.md",
    snippets: [
      "Разделы `Module Inventory`:",
      "`Product Part` — это верхний уровень продукта в этом DSL",
      "Правила для `Relation`:",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_modules/module-inventory-merge-rules.md",
    snippets: [
      "Когда runtime передаёт change summary:",
      "Не переводите молча standalone modules в cluster members",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_facades/facade-map-template.md",
    snippets: [
      "Здесь кратко поясняется внешний смысл facade",
      "Показывайте только те facade relations",
    ],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_facades/facade-map-field-reference.md",
    snippets: ["Поля `Facade`:", "Поля `Facade Relation`:"],
  },
  {
    relativePath:
      ".codeai-hub/templates/diagram_facades/facade-map-merge-rules.md",
    snippets: [
      "Когда runtime передаёт change summary:",
      "Не восстанавливайте молча facades или relations",
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
