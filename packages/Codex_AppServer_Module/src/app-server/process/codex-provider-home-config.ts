import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CONFIG_FILENAME = "config.toml";
const DEFAULT_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/mu;
const FIRST_SECTION_LINE_REGEX = /^\s*\[.+\]\s*$/mu;

type ReasoningSummaryMode = "auto" | "none";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveSettingsPath = (): string =>
  asNonEmptyString(process.env.CODEX_SETTINGS_PATH) ??
  asNonEmptyString(process.env.CLAUDE_SETTINGS_PATH) ??
  DEFAULT_SETTINGS_PATH;

const toSummaryLine = (mode: ReasoningSummaryMode): string =>
  `model_reasoning_summary = "${mode}"`;

export const normalizeCodexProviderHomeConfigToml = (
  raw: string,
  mode: ReasoningSummaryMode
): string => {
  const summaryLine = toSummaryLine(mode);
  const withoutLegacy = raw
    .replace(LEGACY_REASONING_SUMMARY_LINE_REGEX, "")
    .trim();

  if (MODEL_REASONING_SUMMARY_LINE_REGEX.test(withoutLegacy)) {
    return `${withoutLegacy
      .replace(MODEL_REASONING_SUMMARY_LINE_REGEX, summaryLine)
      .trimEnd()}\n`;
  }

  const effortMatch = MODEL_REASONING_EFFORT_LINE_REGEX.exec(withoutLegacy);
  if (effortMatch?.index !== undefined) {
    const insertIndex = effortMatch.index + effortMatch[0].length;
    const prefix = withoutLegacy.slice(0, insertIndex).trimEnd();
    const suffix = withoutLegacy.slice(insertIndex).trimStart();
    return `${[prefix, summaryLine, suffix].filter(Boolean).join("\n")}\n`;
  }

  const sectionMatch = FIRST_SECTION_LINE_REGEX.exec(withoutLegacy);
  if (sectionMatch?.index !== undefined) {
    const prefix = withoutLegacy.slice(0, sectionMatch.index).trimEnd();
    const suffix = withoutLegacy.slice(sectionMatch.index).trimStart();
    return `${[prefix, summaryLine, suffix].filter(Boolean).join("\n")}\n`;
  }

  return `${[withoutLegacy, summaryLine].filter(Boolean).join("\n")}\n`;
};

const resolveCodexProviderHomeReasoningSummaryMode =
  async (): Promise<ReasoningSummaryMode> => {
    try {
      const parsed = JSON.parse(
        await readFile(resolveSettingsPath(), "utf8")
      ) as unknown;
      if (!(isRecord(parsed) && isRecord(parsed.providers))) {
        return DEFAULT_REASONING_SUMMARY_ENABLED ? "auto" : "none";
      }
      const codex = parsed.providers.codex;
      if (!isRecord(codex)) {
        return DEFAULT_REASONING_SUMMARY_ENABLED ? "auto" : "none";
      }
      if (typeof codex.reasoningSummaryEnabled === "boolean") {
        return codex.reasoningSummaryEnabled ? "auto" : "none";
      }
      if (typeof codex.thinkingDisplaySyncEnabled === "boolean") {
        return codex.thinkingDisplaySyncEnabled ? "auto" : "none";
      }
    } catch {
      // Missing or invalid settings should keep reasoning summaries visible.
    }
    return DEFAULT_REASONING_SUMMARY_ENABLED ? "auto" : "none";
  };

export const materializeCodexProviderHomeSummaryConfig = async (
  providerCodexHome: string
): Promise<void> => {
  const configPath = path.join(providerCodexHome, CONFIG_FILENAME);
  const raw = await readFile(configPath, "utf8").catch(() => "");
  const next = normalizeCodexProviderHomeConfigToml(
    raw,
    await resolveCodexProviderHomeReasoningSummaryMode()
  );
  await mkdir(providerCodexHome, { recursive: true });
  await writeFile(configPath, next, "utf8");
};
