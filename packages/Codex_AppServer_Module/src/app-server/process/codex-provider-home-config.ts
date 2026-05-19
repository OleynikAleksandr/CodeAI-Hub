import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_FILENAME = "config.toml";
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/mu;
const FIRST_SECTION_LINE_REGEX = /^\s*\[.+\]\s*$/mu;
const PROVIDER_HOME_REASONING_SUMMARY_LINE = 'model_reasoning_summary = "none"';

export const normalizeCodexProviderHomeConfigToml = (raw: string): string => {
  // Provider-home config is process-global; per-turn summary is capability-gated
  // in the App Server facade for models that support it.
  const summaryLine = PROVIDER_HOME_REASONING_SUMMARY_LINE;
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

export const materializeCodexProviderHomeSummaryConfig = async (
  providerCodexHome: string
): Promise<void> => {
  const configPath = path.join(providerCodexHome, CONFIG_FILENAME);
  const raw = await readFile(configPath, "utf8").catch(() => "");
  const next = normalizeCodexProviderHomeConfigToml(raw);
  await mkdir(providerCodexHome, { recursive: true });
  await writeFile(configPath, next, "utf8");
};
