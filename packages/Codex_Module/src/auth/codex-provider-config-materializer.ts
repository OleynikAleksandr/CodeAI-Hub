import { readFileSync } from "node:fs";
import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CODEX_CONFIG_FILE = "config.toml";
const SETTINGS_FILE = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);
const NEWLINE_SPLIT_REGEX = /\r?\n/u;
const MIGRATION_LINE_REGEX =
  /^\s*(["']?)gpt-5\.4\1\s*=\s*(["']?)gpt-5\.3-codex\2\s*(#.*)?$/u;
const MODEL_LINE_REGEX = /^\s*model\s*=\s*(.+?)\s*$/u;
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*(.+?)\s*$/u;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*(.+?)\s*$/u;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/u;

export type CodexReasoningSummaryMode = "auto" | "none";

export interface CodexProviderConfigOverrides {
  readonly model?: string;
  readonly modelReasoningSummary: CodexReasoningSummaryMode;
}

interface ConfigTomlState {
  changed: boolean;
  currentSection: string | null;
  foundModel: boolean;
  foundReasoningSummary: boolean;
  inModelMigrationsSection: boolean;
  insertAfterReasoningEffortIndex: number;
  insertBeforeFirstSectionIndex: number;
  nextLines: string[];
}

type RootConfigLineKind =
  | { readonly kind: "model"; readonly value: string | null }
  | { readonly kind: "legacy_reasoning_summary" }
  | { readonly kind: "model_reasoning_effort" }
  | { readonly kind: "model_reasoning_summary"; readonly value: string | null }
  | { readonly kind: "other" };

const toQuotedTomlString = (value: string): string => `"${value}"`;

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const resolveDesiredCodexModel = (): string | undefined => {
  const envModel = normalizeOptionalString(process.env.CODEX_DEFAULT_MODEL);
  if (envModel) {
    return envModel;
  }

  const settingsPath =
    normalizeOptionalString(process.env.CLAUDE_SETTINGS_PATH) ?? SETTINGS_FILE;

  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as unknown;
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

const classifyRootConfigLine = (line: string): RootConfigLineKind => {
  const modelMatch = MODEL_LINE_REGEX.exec(line);
  if (modelMatch) {
    return {
      kind: "model",
      value: modelMatch[1]?.trim() ?? null,
    };
  }

  const modelReasoningSummaryMatch =
    MODEL_REASONING_SUMMARY_LINE_REGEX.exec(line);
  if (modelReasoningSummaryMatch) {
    return {
      kind: "model_reasoning_summary",
      value: modelReasoningSummaryMatch[1]?.trim() ?? null,
    };
  }

  if (LEGACY_REASONING_SUMMARY_LINE_REGEX.test(line)) {
    return { kind: "legacy_reasoning_summary" };
  }

  if (MODEL_REASONING_EFFORT_LINE_REGEX.test(line)) {
    return { kind: "model_reasoning_effort" };
  }

  return { kind: "other" };
};

const handleModelLine = (options: {
  readonly classification: Extract<
    RootConfigLineKind,
    { readonly kind: "model" }
  >;
  readonly desiredModelLiteral: string | null;
  readonly line: string;
  readonly state: ConfigTomlState;
}): void => {
  options.state.foundModel = true;
  if (!options.desiredModelLiteral) {
    options.state.nextLines.push(options.line);
    return;
  }

  const nextLine = `model = ${options.desiredModelLiteral}`;
  if (options.classification.value !== options.desiredModelLiteral) {
    options.state.changed = true;
    options.state.nextLines.push(nextLine);
    return;
  }

  options.state.nextLines.push(options.line);
};

const handleReasoningSummaryLine = (options: {
  readonly classification: Extract<
    RootConfigLineKind,
    { readonly kind: "model_reasoning_summary" }
  >;
  readonly desiredReasoningSummaryLiteral: string;
  readonly line: string;
  readonly state: ConfigTomlState;
}): void => {
  options.state.foundReasoningSummary = true;
  const nextLine = `model_reasoning_summary = ${options.desiredReasoningSummaryLiteral}`;
  if (options.classification.value !== options.desiredReasoningSummaryLiteral) {
    options.state.changed = true;
    options.state.nextLines.push(nextLine);
    return;
  }

  options.state.nextLines.push(options.line);
};

const handleRootConfigLine = (options: {
  readonly classification: RootConfigLineKind;
  readonly desiredModelLiteral: string | null;
  readonly desiredReasoningSummaryLiteral: string;
  readonly line: string;
  readonly state: ConfigTomlState;
}): boolean => {
  if (options.classification.kind === "model") {
    handleModelLine({
      classification: options.classification,
      desiredModelLiteral: options.desiredModelLiteral,
      line: options.line,
      state: options.state,
    });
    return true;
  }

  if (options.classification.kind === "legacy_reasoning_summary") {
    options.state.changed = true;
    return true;
  }

  if (options.classification.kind === "model_reasoning_effort") {
    options.state.insertAfterReasoningEffortIndex =
      options.state.nextLines.length;
    return false;
  }

  if (options.classification.kind === "model_reasoning_summary") {
    handleReasoningSummaryLine({
      classification: options.classification,
      desiredReasoningSummaryLiteral: options.desiredReasoningSummaryLiteral,
      line: options.line,
      state: options.state,
    });
    return true;
  }

  return false;
};

const applyConfigTomlLine = (
  line: string,
  state: ConfigTomlState,
  desiredModelLiteral: string | null,
  desiredReasoningSummaryLiteral: string
): void => {
  const trimmed = line.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    if (state.insertBeforeFirstSectionIndex < 0) {
      state.insertBeforeFirstSectionIndex = state.nextLines.length;
    }
    state.currentSection = trimmed;
    state.inModelMigrationsSection = trimmed === "[notice.model_migrations]";
    state.nextLines.push(line);
    return;
  }

  if (state.inModelMigrationsSection && MIGRATION_LINE_REGEX.test(line)) {
    state.changed = true;
    return;
  }

  if (state.currentSection === null) {
    const classification = classifyRootConfigLine(line);
    if (
      handleRootConfigLine({
        classification,
        desiredModelLiteral,
        desiredReasoningSummaryLiteral,
        line,
        state,
      })
    ) {
      return;
    }
  }

  state.nextLines.push(line);
};

const insertModelLine = (
  state: ConfigTomlState,
  desiredModelLiteral: string
): void => {
  const nextLine = `model = ${desiredModelLiteral}`;
  if (state.insertBeforeFirstSectionIndex >= 0) {
    state.nextLines.splice(state.insertBeforeFirstSectionIndex, 0, nextLine);
    return;
  }
  state.nextLines.unshift(nextLine);
};

const insertReasoningSummaryLine = (
  state: ConfigTomlState,
  desiredReasoningSummaryLiteral: string
): void => {
  const nextLine = `model_reasoning_summary = ${desiredReasoningSummaryLiteral}`;
  if (state.insertAfterReasoningEffortIndex >= 0) {
    state.nextLines.splice(
      state.insertAfterReasoningEffortIndex + 1,
      0,
      nextLine
    );
    return;
  }
  if (state.insertBeforeFirstSectionIndex >= 0) {
    state.nextLines.splice(state.insertBeforeFirstSectionIndex, 0, nextLine);
    return;
  }
  state.nextLines.push(nextLine);
};

export const materializeCodexProviderConfigToml = (
  raw: string,
  overrides: CodexProviderConfigOverrides
): {
  readonly changed: boolean;
  readonly next: string;
} => {
  const state: ConfigTomlState = {
    changed: false,
    currentSection: null,
    foundModel: false,
    foundReasoningSummary: false,
    inModelMigrationsSection: false,
    insertAfterReasoningEffortIndex: -1,
    insertBeforeFirstSectionIndex: -1,
    nextLines: [],
  };
  const desiredModel = normalizeOptionalString(overrides.model);
  const desiredModelLiteral = desiredModel
    ? toQuotedTomlString(desiredModel)
    : null;
  const desiredReasoningSummaryLiteral = toQuotedTomlString(
    overrides.modelReasoningSummary
  );

  for (const line of raw.split(NEWLINE_SPLIT_REGEX)) {
    applyConfigTomlLine(
      line,
      state,
      desiredModelLiteral,
      desiredReasoningSummaryLiteral
    );
  }

  if (desiredModelLiteral && !state.foundModel) {
    state.changed = true;
    insertModelLine(state, desiredModelLiteral);
  }

  if (!state.foundReasoningSummary) {
    state.changed = true;
    insertReasoningSummaryLine(state, desiredReasoningSummaryLiteral);
  }

  return { changed: state.changed, next: state.nextLines.join("\n") };
};

export class CodexProviderConfigMaterializer {
  private readonly legacyCodexHome: string;
  private readonly overrides: CodexProviderConfigOverrides;
  private readonly providerCodexHome: string;

  constructor(options: {
    readonly legacyCodexHome: string;
    readonly overrides: CodexProviderConfigOverrides;
    readonly providerCodexHome: string;
  }) {
    this.legacyCodexHome = options.legacyCodexHome;
    this.overrides = options.overrides;
    this.providerCodexHome = options.providerCodexHome;
  }

  async ensureProviderConfigToml(): Promise<void> {
    await mkdir(this.providerCodexHome, { recursive: true });
    const destination = path.join(this.providerCodexHome, CODEX_CONFIG_FILE);
    const source = path.join(this.legacyCodexHome, CODEX_CONFIG_FILE);
    const baseRaw = await this.readBaseConfigToml(source);
    const desiredModel =
      normalizeOptionalString(this.overrides.model) ??
      resolveDesiredCodexModel();
    const { next } = materializeCodexProviderConfigToml(baseRaw, {
      ...this.overrides,
      ...(desiredModel ? { model: desiredModel } : {}),
    });
    const normalizedNext = `${next.trimEnd()}\n`;

    let existingRaw: string | null = null;
    let shouldUnlinkDestination = false;

    try {
      const stats = await lstat(destination);
      if (stats.isSymbolicLink()) {
        shouldUnlinkDestination = true;
      } else {
        existingRaw = await readFile(destination, "utf8");
      }
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code !== "ENOENT") {
        throw error;
      }
    }

    if (!shouldUnlinkDestination && existingRaw === normalizedNext) {
      return;
    }

    if (shouldUnlinkDestination) {
      await unlink(destination);
    }

    await writeFile(destination, normalizedNext, "utf8");
  }

  private async readBaseConfigToml(sourcePath: string): Promise<string> {
    try {
      return await readFile(sourcePath, "utf8");
    } catch (error) {
      const candidate = error as NodeJS.ErrnoException;
      if (candidate.code === "ENOENT") {
        return "";
      }
      throw error;
    }
  }
}
