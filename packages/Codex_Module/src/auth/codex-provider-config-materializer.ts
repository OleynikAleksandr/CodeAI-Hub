import { lstat, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CODEX_CONFIG_FILE = "config.toml";
const NEWLINE_SPLIT_REGEX = /\r?\n/u;
const MIGRATION_LINE_REGEX =
  /^\s*(["']?)gpt-5\.4\1\s*=\s*(["']?)gpt-5\.3-codex\2\s*(#.*)?$/u;
const LEGACY_REASONING_SUMMARY_LINE_REGEX =
  /^\s*default_reasoning_summary\s*=\s*(.+?)\s*$/u;
const MODEL_REASONING_SUMMARY_LINE_REGEX =
  /^\s*model_reasoning_summary\s*=\s*(.+?)\s*$/u;
const MODEL_REASONING_EFFORT_LINE_REGEX =
  /^\s*model_reasoning_effort\s*=\s*.+$/u;

export type CodexReasoningSummaryMode = "auto" | "none";

export interface CodexProviderConfigOverrides {
  readonly modelReasoningSummary: CodexReasoningSummaryMode;
}

interface ConfigTomlState {
  changed: boolean;
  currentSection: string | null;
  foundReasoningSummary: boolean;
  inModelMigrationsSection: boolean;
  insertAfterReasoningEffortIndex: number;
  insertBeforeFirstSectionIndex: number;
  nextLines: string[];
}

type RootConfigLineKind =
  | { readonly kind: "legacy_reasoning_summary" }
  | { readonly kind: "model_reasoning_effort" }
  | { readonly kind: "model_reasoning_summary"; readonly value: string | null }
  | { readonly kind: "other" };

const toQuotedTomlString = (value: string): string => `"${value}"`;

const classifyRootConfigLine = (line: string): RootConfigLineKind => {
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

const applyConfigTomlLine = (
  line: string,
  state: ConfigTomlState,
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
    if (classification.kind === "legacy_reasoning_summary") {
      state.changed = true;
      return;
    }
    if (classification.kind === "model_reasoning_effort") {
      state.insertAfterReasoningEffortIndex = state.nextLines.length;
    }
    if (classification.kind === "model_reasoning_summary") {
      state.foundReasoningSummary = true;
      const nextLine = `model_reasoning_summary = ${desiredReasoningSummaryLiteral}`;
      if (classification.value !== desiredReasoningSummaryLiteral) {
        state.changed = true;
        state.nextLines.push(nextLine);
        return;
      }
      state.nextLines.push(line);
      return;
    }
  }

  state.nextLines.push(line);
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
    foundReasoningSummary: false,
    inModelMigrationsSection: false,
    insertAfterReasoningEffortIndex: -1,
    insertBeforeFirstSectionIndex: -1,
    nextLines: [],
  };
  const desiredReasoningSummaryLiteral = toQuotedTomlString(
    overrides.modelReasoningSummary
  );

  for (const line of raw.split(NEWLINE_SPLIT_REGEX)) {
    applyConfigTomlLine(line, state, desiredReasoningSummaryLiteral);
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
    const { next } = materializeCodexProviderConfigToml(
      baseRaw,
      this.overrides
    );
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
