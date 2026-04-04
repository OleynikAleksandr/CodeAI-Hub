import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CODEX_CONFIG_FILE = "config.toml";
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const LEGACY_CODEX_HOME = path.join(homedir(), ".codex");
const PROVIDER_CODEX_HOME = path.join(
  homedir(),
  ".codeai-hub",
  "providers",
  "codex",
  "home"
);
const SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const MODEL_LINE_REGEX = /^\s*model\s*=\s*.+?$/mu;
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/mu;
const FIRST_SECTION_LINE_REGEX = /^\s*\[.+\]\s*$/mu;

const toReasoningSummaryLiteral = (enabled: boolean): string =>
  enabled ? '"auto"' : '"none"';

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveCodexDefaultModel = async (): Promise<string | undefined> => {
  const envModel = normalizeOptionalString(process.env.CODEX_DEFAULT_MODEL);
  if (envModel) {
    return envModel;
  }

  try {
    const parsed = JSON.parse(await readFile(SETTINGS_FILE, "utf8")) as unknown;
    if (!(isRecord(parsed) && isRecord(parsed.providers))) {
      return undefined;
    }
    const codex = parsed.providers.codex;
    return isRecord(codex)
      ? normalizeOptionalString(codex.defaultModel)
      : undefined;
  } catch {
    return undefined;
  }
};

const normalizeConfigToml = (
  raw: string,
  enabled: boolean,
  model?: string
): string => {
  const reasoningSummaryLine = `model_reasoning_summary = ${toReasoningSummaryLiteral(enabled)}`;
  const next = raw.replace(LEGACY_REASONING_SUMMARY_LINE_REGEX, "").trimEnd();
  const modelLine =
    typeof model === "string" && model.trim().length > 0
      ? `model = "${model.trim()}"`
      : null;
  let withModel = next;
  if (modelLine !== null) {
    withModel = MODEL_LINE_REGEX.test(next)
      ? next.replace(MODEL_LINE_REGEX, modelLine)
      : `${[modelLine, next].filter(Boolean).join("\n")}`;
  }

  if (MODEL_REASONING_SUMMARY_LINE_REGEX.test(withModel)) {
    return `${withModel
      .replace(MODEL_REASONING_SUMMARY_LINE_REGEX, reasoningSummaryLine)
      .trimEnd()}\n`;
  }

  const reasoningEffortMatch =
    MODEL_REASONING_EFFORT_LINE_REGEX.exec(withModel);
  if (reasoningEffortMatch?.index !== undefined) {
    const insertIndex =
      reasoningEffortMatch.index + reasoningEffortMatch[0].length;
    const prefix = withModel.slice(0, insertIndex).trimEnd();
    const suffix = withModel.slice(insertIndex).trimStart();
    return `${[prefix, reasoningSummaryLine, suffix].filter(Boolean).join("\n")}\n`;
  }

  const firstSectionMatch = FIRST_SECTION_LINE_REGEX.exec(withModel);
  if (firstSectionMatch?.index !== undefined) {
    const prefix = withModel.slice(0, firstSectionMatch.index).trimEnd();
    const suffix = withModel.slice(firstSectionMatch.index).trimStart();
    return `${[prefix, reasoningSummaryLine, suffix].filter(Boolean).join("\n")}\n`;
  }

  return `${[withModel, reasoningSummaryLine].filter(Boolean).join("\n")}\n`;
};

const readBaseConfigToml = async (): Promise<string> => {
  try {
    return await readFile(
      path.join(LEGACY_CODEX_HOME, CODEX_CONFIG_FILE),
      "utf8"
    );
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return "";
    }
    throw error;
  }
};

const readProviderConfigToml = async (
  destination: string
): Promise<{
  readonly raw: string;
  readonly shouldUnlink: boolean;
}> => {
  try {
    const stats = await lstat(destination);
    if (stats.isSymbolicLink()) {
      return { raw: await readBaseConfigToml(), shouldUnlink: true };
    }
    return {
      raw: await readFile(destination, "utf8"),
      shouldUnlink: false,
    };
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException;
    if (candidate.code === "ENOENT") {
      return { raw: await readBaseConfigToml(), shouldUnlink: false };
    }
    throw error;
  }
};

export const syncCodexProviderReasoningSummaryConfig = async (
  enabled: boolean = DEFAULT_REASONING_SUMMARY_ENABLED
): Promise<void> => {
  await mkdir(PROVIDER_CODEX_HOME, { recursive: true });
  const destination = path.join(PROVIDER_CODEX_HOME, CODEX_CONFIG_FILE);
  const { raw, shouldUnlink } = await readProviderConfigToml(destination);
  const next = normalizeConfigToml(
    raw,
    enabled,
    await resolveCodexDefaultModel()
  );

  if (shouldUnlink) {
    await unlink(destination);
  }

  await writeFile(destination, next, "utf8");
};
