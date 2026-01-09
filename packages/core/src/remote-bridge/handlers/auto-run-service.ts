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

const FLOW_STAGES = new Set(["idea", "spec", "plan", "execute"]);

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
  return null;
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

  const store = new RunStore();
  const run = await store.createAutoRun(
    input.workspacePath,
    input.initiativeSlug,
    modelLabel
  );
  await store.selectCurrent(
    input.workspacePath,
    input.initiativeSlug,
    run.runId
  );
  return run;
};
