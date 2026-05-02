import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { CodexAppServerProcessProfileKey } from "../app-server/process/codex-app-server-process-profile";
import type { CodexReasoningSummaryMode } from "../types";

const DEFAULT_REASONING_SUMMARY: CodexReasoningSummaryMode = "detailed";
const DEFAULT_REASONING_SUMMARY_ENABLED = true;
const DEFAULT_SETTINGS_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "settings",
  "settings.json"
);

export interface CodexNativeRequestCaptureAppliedInputEnvelope {
  readonly approvalPolicy: string | null;
  readonly kind: "codex";
  readonly modelReasoningSummary: string | null;
  readonly persistExtendedHistory: boolean | null;
  readonly processProfileKey: string | null;
  readonly providerHomeOverrides: Readonly<
    Record<string, string | null>
  > | null;
  readonly sandbox: string | null;
}

export interface CodexNativeRequestCaptureAppliedEnvelopeInput {
  readonly processProfileKey: CodexAppServerProcessProfileKey;
  readonly providerHomeOverrides?: Readonly<
    Record<string, string | null>
  > | null;
  readonly threadStartParams: Record<string, unknown>;
  readonly turnStartParams: Record<string, unknown>;
}

export const buildCodexNativeRequestCaptureAppliedEnvelope = (
  input: CodexNativeRequestCaptureAppliedEnvelopeInput
): CodexNativeRequestCaptureAppliedInputEnvelope => ({
  approvalPolicy: asStringOrNull(input.threadStartParams.approvalPolicy),
  kind: "codex",
  modelReasoningSummary: asStringOrNull(input.turnStartParams.summary),
  persistExtendedHistory: asBooleanOrNull(
    input.threadStartParams.persistExtendedHistory
  ),
  processProfileKey: input.processProfileKey,
  providerHomeOverrides: input.providerHomeOverrides ?? null,
  sandbox: asStringOrNull(input.threadStartParams.sandbox),
});

export const parseProviderHomeRolloutJsonl = (
  text: string
): readonly unknown[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseProviderHomeRolloutLine(line));

export const resolveCodexNativeRequestCaptureTurnReasoningSummaryMode =
  (): CodexReasoningSummaryMode =>
    resolveReasoningSummaryEnabled() ? DEFAULT_REASONING_SUMMARY : "none";

const asBooleanOrNull = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;

const asRecordOrNull = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const resolveSettingsPath = (): string =>
  asStringOrNull(process.env.CODEX_SETTINGS_PATH) ??
  asStringOrNull(process.env.CLAUDE_SETTINGS_PATH) ??
  DEFAULT_SETTINGS_PATH;

const resolveReasoningSummaryEnabled = (): boolean => {
  try {
    const parsed = asRecordOrNull(
      JSON.parse(readFileSync(resolveSettingsPath(), "utf8")) as unknown
    );
    const providers = asRecordOrNull(parsed?.providers);
    const codex = asRecordOrNull(providers?.codex);
    if (typeof codex?.reasoningSummaryEnabled === "boolean") {
      return codex.reasoningSummaryEnabled;
    }
    if (typeof codex?.thinkingDisplaySyncEnabled === "boolean") {
      return codex.thinkingDisplaySyncEnabled;
    }
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  } catch {
    return DEFAULT_REASONING_SUMMARY_ENABLED;
  }
};

const parseProviderHomeRolloutLine = (line: string): unknown => {
  try {
    return JSON.parse(line) as unknown;
  } catch (error) {
    return {
      parseError:
        error instanceof Error ? error.message : "Unknown JSON parse error",
      rawLine: line,
    };
  }
};
