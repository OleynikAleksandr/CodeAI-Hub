import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { NodeAgentSessionBootstrapper } from "./node-agent-session-bootstrapper";

type BootstrapNodeKind = "cluster" | "module" | "product_part";

interface BootstrapNode {
  readonly absolutePath: string;
  readonly clusterId?: string;
  readonly id: string;
  readonly kind: BootstrapNodeKind;
  readonly partId: string;
  readonly relativePath: string;
}

const PRODUCT_PART_PURPOSE_CONTEXT_PATTERN =
  /Project Manager является основной пользовательской средой продукта/;
const PRODUCT_PART_RELATION_CONTEXT_PATTERN =
  /workflow-step-navigation` \| `artifact-review-workspace` \| sync-call/;
const HEADING_LEVEL_RE = /^#+/u;
const MARKDOWN_HEADING_RE = /^(#+)\s/u;
const LINE_BREAK_RE = /\r?\n/u;

const writeWorkspaceArtifact = async (
  workspacePath: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspacePath, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const extractMarkdownSection = (content: string, heading: string): string => {
  const lines = content.split(LINE_BREAK_RE);
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  assert.notEqual(startIndex, -1, `Missing markdown heading: ${heading}`);
  const headingLevel = heading.match(HEADING_LEVEL_RE)?.[0].length ?? 1;
  const endIndex = lines.findIndex((line, index) => {
    if (index <= startIndex) {
      return false;
    }
    const match = line.match(MARKDOWN_HEADING_RE);
    return match ? match[1].length <= headingLevel : false;
  });
  return lines
    .slice(startIndex, endIndex === -1 ? lines.length : endIndex)
    .join("\n")
    .trim();
};

const extractPromptMarkdownEntries = (
  prompt: string,
  relativePath: string
): readonly string[] => {
  const entries: string[] = [];
  const marker = `- Path: ${relativePath}`;
  let searchIndex = 0;
  while (searchIndex < prompt.length) {
    const markerIndex = prompt.indexOf(marker, searchIndex);
    if (markerIndex === -1) {
      break;
    }
    const fenceStart = prompt.indexOf("```markdown\n", markerIndex);
    if (fenceStart === -1) {
      break;
    }
    const contentStart = fenceStart + "```markdown\n".length;
    const fenceEnd = prompt.indexOf("\n```", contentStart);
    if (fenceEnd === -1) {
      break;
    }
    entries.push(prompt.slice(contentStart, fenceEnd).trim());
    searchIndex = fenceEnd + "\n```".length;
  }
  return entries;
};

const createRealShapeProductPartMarkdown = (): string =>
  [
    "# Product Part: Project Manager",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    "| Part ID | `project-manager` |",
    "| Product Part | `Project Manager` |",
    "| Purpose | Основная standalone-среда пользователя для пошагового проектирования, диалогов и ведения артефактов |",
    "",
    "## Purpose",
    "",
    "Project Manager является основной пользовательской средой продукта, где пользователь проходит шаговый workflow, ведёт диалоги с агентами, просматривает и согласует артефакты.",
    "",
    "## Owned Clusters",
    "",
    "### `workflow-and-artifact-ui`",
    "",
    "**Purpose:** Отвечает за пошаговый сценарий проектирования и представление артефактов для ревью и согласования.",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `workflow-step-navigation` | Управляет переходами между шагами workflow и отображает текущий этап проектирования. |",
    "| `artifact-review-workspace` | Показывает артефакты шага, поддерживает их чтение, сравнение и пользовательское подтверждение. |",
    "| `step-guidance-panel` | Дает пользователю контекст шага, ожидания результата и критерии готовности перед переходом дальше. |",
    "",
    "### `session-workspace-ui`",
    "",
    "**Purpose:** Управляет пользовательским рабочим контекстом текущего проекта и непрерывностью взаимодействия в интерфейсе.",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `project-context-hub` | Поддерживает активный контекст проекта и навигацию по его рабочим областям. |",
    "| `conversation-surface` | Обеспечивает диалоговую поверхность взаимодействия пользователя с агентом внутри текущего шага. |",
    "| `continuity-indicator` | Показывает статус сессии, сигналы восстановления и готовность продолжения работы после сбоев. |",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `settings-live-surface` | Предоставляет единый live-интерфейс для provider/model, reasoning, language/localization и recovery-действий. |",
    "| `cef-launcher` | Запускает и удерживает desktop-оболочку Project Manager как локальную пользовательскую точку входа. |",
    "",
    "## Simple Relations",
    "",
    "| From | To | Type | Label |",
    "| --- | --- | --- | --- |",
    "| `workflow-step-navigation` | `artifact-review-workspace` | sync-call | open-active-artifact |",
    "| `artifact-review-workspace` | `step-guidance-panel` | shared-data | step-context |",
    "| `conversation-surface` | `artifact-review-workspace` | async-event | agent-approved-content |",
    "",
    "## Assumptions / Open Questions",
    "",
    "- Граница `Project Manager ↔ Core Runtime` предполагается внешней для этого файла.",
  ].join("\n");

const bootstrapPrompt = async (
  workspacePath: string,
  workspaceSlug: string,
  node: BootstrapNode
): Promise<string> => {
  const sentMessages: string[] = [];
  await new NodeAgentSessionBootstrapper().bootstrapNode(node, {
    gateway: {
      createSessionForWorkflow: () => Promise.resolve({ id: "session-1" }),
      handleMessage: (_sessionId, content) => {
        sentMessages.push(content);
        return Promise.resolve();
      },
    },
    providerId: "codexCli",
    technologyBase: "TypeScript",
    workspacePath,
    workspaceSlug,
  });
  return sentMessages[0] ?? "";
};

test("NodeAgentSessionBootstrapper matches oracle context for product part, cluster, and module nodes", async () => {
  const workspacePath = await mkdtemp(
    path.join(os.tmpdir(), "node-agent-oracle-context-")
  );
  const workspaceSlug = "demo-workspace";
  const productPartRelativePath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`;
  try {
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      [
        "# Final Description",
        "## Project Manager",
        "Project Manager shell context should be available but must not displace exact owner markdown.",
        "## Project Manager Setup",
        "Project Manager setup context also matches the broad product-part anchor.",
        "## Core Runtime",
        "Core Runtime manages provider processes.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      [
        "# Virtual Simulation",
        "## Project Manager Scenario",
        "Project Manager scenario context also matches the broad product-part anchor.",
        "## Project Manager Recovery",
        "Project Manager recovery context also matches the broad product-part anchor.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      [
        "# Product Parts Index",
        "### Product Part: project-manager",
        "project-manager owns the Project Manager product part.",
        "### Product Part: core-runtime",
        "core-runtime owns the Core Runtime product part.",
      ].join("\n")
    );
    await writeWorkspaceArtifact(
      workspacePath,
      productPartRelativePath,
      createRealShapeProductPartMarkdown()
    );

    const sourceProductPartMarkdown = (
      await readFile(path.join(workspacePath, productPartRelativePath), "utf8")
    ).trim();
    const expectedWorkflowClusterContext = extractMarkdownSection(
      sourceProductPartMarkdown,
      "### `workflow-and-artifact-ui`"
    );
    const expectedSessionClusterContext = extractMarkdownSection(
      sourceProductPartMarkdown,
      "### `session-workspace-ui`"
    );
    const expectedRelationsContext = extractMarkdownSection(
      sourceProductPartMarkdown,
      "## Simple Relations"
    );

    const productPartPrompt = await bootstrapPrompt(
      workspacePath,
      workspaceSlug,
      {
        absolutePath: path.join(
          workspacePath,
          `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager`
        ),
        id: "project-manager",
        kind: "product_part",
        partId: "project-manager",
        relativePath: `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager`,
      }
    );
    const clusterPrompt = await bootstrapPrompt(workspacePath, workspaceSlug, {
      absolutePath: path.join(
        workspacePath,
        `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui`
      ),
      clusterId: "workflow-and-artifact-ui",
      id: "workflow-and-artifact-ui",
      kind: "cluster",
      partId: "project-manager",
      relativePath: `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui`,
    });
    const modulePrompt = await bootstrapPrompt(workspacePath, workspaceSlug, {
      absolutePath: path.join(
        workspacePath,
        `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/artifact-review-workspace`
      ),
      clusterId: "workflow-and-artifact-ui",
      id: "artifact-review-workspace",
      kind: "module",
      partId: "project-manager",
      relativePath: `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/project-manager/clusters/workflow-and-artifact-ui/modules/artifact-review-workspace`,
    });

    const productPartEntries = extractPromptMarkdownEntries(
      productPartPrompt,
      productPartRelativePath
    );
    const clusterEntries = extractPromptMarkdownEntries(
      clusterPrompt,
      productPartRelativePath
    );
    const moduleEntries = extractPromptMarkdownEntries(
      modulePrompt,
      productPartRelativePath
    );

    assert.deepEqual(productPartEntries, [sourceProductPartMarkdown]);
    assert.match(productPartPrompt, PRODUCT_PART_PURPOSE_CONTEXT_PATTERN);
    assert.match(productPartPrompt, PRODUCT_PART_RELATION_CONTEXT_PATTERN);
    assert.ok(clusterEntries.includes(expectedWorkflowClusterContext));
    assert.ok(!clusterEntries.includes(expectedSessionClusterContext));
    assert.ok(moduleEntries.includes(expectedWorkflowClusterContext));
    assert.ok(moduleEntries.includes(expectedRelationsContext));
    assert.ok(!moduleEntries.includes(expectedSessionClusterContext));
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
});
