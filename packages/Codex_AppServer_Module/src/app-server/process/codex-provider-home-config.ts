import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_FILENAME = "config.toml";
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*.+?$/gmu;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/mu;
const TOP_LEVEL_MODEL_PROVIDER_LINE_REGEX = /^\s*model_provider\s*=\s*.+?$/gmu;
const TOP_LEVEL_MODEL_LINE_REGEX = /^\s*model\s*=\s*.+?$/gmu;
const FIRST_SECTION_LINE_REGEX = /^\s*\[.+\]\s*$/mu;
const TOML_SECTION_LINE_REGEX = /^\s*\[([^\]]+)\]\s*$/u;
const PROVIDER_HOME_REASONING_SUMMARY_LINE = 'model_reasoning_summary = "none"';
const KIMI_CODEX_MODEL_PROVIDER_SECTION = "model_providers.kimi";
const KIMI_CODEX_DEFAULT_MODEL_PROVIDER = "kimi";
const KIMI_CODEX_DEFAULT_MODEL = "kimi-for-coding";
const KIMI_CODEX_DEFAULT_BASE_URL = "https://api.kimi.com/coding/v1";
const KIMI_CODEX_DEFAULT_ENV_KEY = "KIMI_API_KEY";
const KIMI_CODEX_DEFAULT_WIRE_API = "chat";

type KimiCodexWireApi = "chat" | "responses";

interface KimiCodexProviderHomeConfigOptions {
  readonly baseUrl?: string;
  readonly envKey?: string;
  readonly model?: string;
  readonly modelProvider?: string;
  readonly name?: string;
  readonly wireApi?: KimiCodexWireApi;
}

const quoteTomlString = (value: string): string => JSON.stringify(value);

const removeTomlSection = (raw: string, sectionName: string): string => {
  const lines = raw.split("\n");
  const keptLines: string[] = [];
  let shouldSkip = false;

  for (const line of lines) {
    const sectionMatch = line.match(TOML_SECTION_LINE_REGEX);
    if (sectionMatch) {
      shouldSkip = sectionMatch[1] === sectionName;
    }

    if (!shouldSkip) {
      keptLines.push(line);
    }
  }

  return keptLines.join("\n");
};

const insertBeforeFirstSection = (raw: string, insert: string): string => {
  const firstSectionMatch = FIRST_SECTION_LINE_REGEX.exec(raw);
  if (firstSectionMatch?.index === undefined) {
    return `${insert}\n${raw.trimStart()}`;
  }

  return `${raw.slice(0, firstSectionMatch.index).trimEnd()}\n${insert}\n\n${raw.slice(firstSectionMatch.index).trimStart()}`;
};

const buildKimiCodexProviderBlock = (
  options: KimiCodexProviderHomeConfigOptions
): string => {
  const modelProvider =
    options.modelProvider ?? KIMI_CODEX_DEFAULT_MODEL_PROVIDER;
  const name = options.name ?? "Kimi";
  const baseUrl = options.baseUrl ?? KIMI_CODEX_DEFAULT_BASE_URL;
  const envKey = options.envKey ?? KIMI_CODEX_DEFAULT_ENV_KEY;
  const wireApi = options.wireApi ?? KIMI_CODEX_DEFAULT_WIRE_API;

  return [
    `[model_providers.${modelProvider}]`,
    `name = ${quoteTomlString(name)}`,
    `base_url = ${quoteTomlString(baseUrl)}`,
    `env_key = ${quoteTomlString(envKey)}`,
    `wire_api = ${quoteTomlString(wireApi)}`,
  ].join("\n");
};

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

export const normalizeKimiCodexProviderHomeConfigToml = (
  raw: string,
  options: KimiCodexProviderHomeConfigOptions = {}
): string => {
  const modelProvider =
    options.modelProvider ?? KIMI_CODEX_DEFAULT_MODEL_PROVIDER;
  const model = options.model ?? KIMI_CODEX_DEFAULT_MODEL;
  const baseConfig = normalizeCodexProviderHomeConfigToml(raw)
    .replace(TOP_LEVEL_MODEL_PROVIDER_LINE_REGEX, "")
    .replace(TOP_LEVEL_MODEL_LINE_REGEX, "");
  const withoutExistingProviderBlock = removeTomlSection(
    baseConfig,
    KIMI_CODEX_MODEL_PROVIDER_SECTION
  );
  const topLevelLines = [
    `model = ${quoteTomlString(model)}`,
    `model_provider = ${quoteTomlString(modelProvider)}`,
  ].join("\n");
  const withTopLevel = insertBeforeFirstSection(
    withoutExistingProviderBlock.trim(),
    topLevelLines
  );
  const providerBlock = buildKimiCodexProviderBlock(options);

  return `${withTopLevel.trimEnd()}\n\n${providerBlock}\n`;
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

export const materializeKimiCodexProviderHomeConfig = async (
  providerCodexHome: string,
  options: KimiCodexProviderHomeConfigOptions = {}
): Promise<void> => {
  const configPath = path.join(providerCodexHome, CONFIG_FILENAME);
  const raw = await readFile(configPath, "utf8").catch(() => "");
  const next = normalizeKimiCodexProviderHomeConfigToml(raw, options);
  await mkdir(providerCodexHome, { recursive: true });
  await writeFile(configPath, next, "utf8");
};
