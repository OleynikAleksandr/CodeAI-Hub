import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type RunManifest, RunStore } from "@codeai-hub/initiatives";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";

type AutoRunInput = {
  readonly workspacePath: string;
  readonly initiativeSlug: string | null;
  readonly stage: string | null;
  readonly providerId: string;
  readonly config: CoreConfig;
  readonly logger: Logger;
};

const FLOW_STAGES = new Set([
  "idea",
  "description",
  "virtual_simulation",
  "diagram_modules",
  "diagram_facades",
  "spec",
  "plan",
  "execute",
]);
const IDEA_STAGE = "idea";
const QUESTIONNAIRE_FILE = "questionnaire.md";

const resolveModelLabel = (
  providerId: string,
  config: CoreConfig
): string | null => {
  if (providerId === "codexCli") {
    return config.codexDefaultModel ?? null;
  }
  if (providerId === "claudeCodeCli") {
    return config.claudeDefaultModel;
  }
  if (providerId === "geminiCli") {
    return config.geminiDefaultModel ?? "default";
  }
  return null;
};

const normalizeModelLabelForRun = (
  providerId: string,
  modelLabel: string
): string => {
  if (modelLabel === "default") {
    if (providerId === "codexCli") {
      return "gpt-5.2-codex";
    }
    if (providerId === "claudeCodeCli") {
      return "sonnet";
    }
  }
  return modelLabel;
};

const resolveQuestionnairePath = (
  workspacePath: string,
  initiativeSlug: string,
  runSlug: string
): string =>
  path.join(
    workspacePath,
    ".codeai-hub",
    "initiatives",
    initiativeSlug,
    "runs",
    runSlug,
    IDEA_STAGE,
    QUESTIONNAIRE_FILE
  );

const loadQuestionnaire = async (
  workspacePath: string,
  initiativeSlug: string,
  runSlug: string
): Promise<string | null> => {
  try {
    return await readFile(
      resolveQuestionnairePath(workspacePath, initiativeSlug, runSlug),
      "utf8"
    );
  } catch {
    return null;
  }
};

const saveQuestionnaire = async (
  workspacePath: string,
  initiativeSlug: string,
  runSlug: string,
  content: string
): Promise<void> => {
  const targetPath = resolveQuestionnairePath(
    workspacePath,
    initiativeSlug,
    runSlug
  );
  await mkdir(path.dirname(targetPath), { recursive: true });
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  await writeFile(targetPath, normalized, "utf8");
};

export const maybeCreateAutoRun = async (
  input: AutoRunInput
): Promise<RunManifest | null> => {
  if (!(input.initiativeSlug && input.stage)) {
    return null;
  }
  if (!FLOW_STAGES.has(input.stage)) {
    return null;
  }

  const modelLabel = resolveModelLabel(input.providerId, input.config);
  if (!modelLabel) {
    input.logger.warn("Auto-run skipped: model label unavailable", {
      providerId: input.providerId,
      stage: input.stage,
    });
    return null;
  }
  const normalizedLabel = normalizeModelLabelForRun(
    input.providerId,
    modelLabel
  );

  const store = new RunStore();
  const latestQuestionnaireRun = await store.findLatestQuestionnaireRun(
    input.workspacePath,
    input.initiativeSlug
  );
  const run = await store.createAutoRun(
    input.workspacePath,
    input.initiativeSlug,
    normalizedLabel,
    input.providerId
  );
  await store.selectCurrent(
    input.workspacePath,
    input.initiativeSlug,
    run.runId
  );

  if (latestQuestionnaireRun) {
    const questionnaire = await loadQuestionnaire(
      input.workspacePath,
      input.initiativeSlug,
      latestQuestionnaireRun.runSlug
    );
    if (questionnaire) {
      await saveQuestionnaire(
        input.workspacePath,
        input.initiativeSlug,
        run.runSlug,
        questionnaire
      );
    }
  }

  return run;
};
