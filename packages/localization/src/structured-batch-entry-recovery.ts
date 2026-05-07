import type { TranslationResult } from "@codeai-hub/translation";
import type { ProtectedGlossaryToken } from "./glossary-contract";
import type { GlossaryProtector } from "./glossary-protector";

const LOCALIZATION_BATCH_MARKER_PREFIX = "__CODEAI_HUB_LOCALIZATION_ENTRY__";
const MISSING_ENTRY_RECOVERY_CONCURRENCY = 4;

export interface StructuredBatchEntry {
  readonly entryId: number;
  readonly messageIds: string[];
  readonly protectedText: string;
  readonly sourceText: string;
  readonly tokens: readonly ProtectedGlossaryToken[];
}

const hasUsableLocalizedText = (text: string): boolean =>
  text.trim().length > 0;

const createBatchMarker = (entryId: number, boundary: "END" | "START") =>
  `${LOCALIZATION_BATCH_MARKER_PREFIX}${entryId}__${boundary}__`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const recoverMissingEntries = async (
  entries: readonly StructuredBatchEntry[],
  retryMissingEntry: (entry: StructuredBatchEntry) => Promise<string | null>
): Promise<readonly (string | null)[]> => {
  const recoveredTexts: (string | null)[] = new Array(entries.length).fill(
    null
  );
  let nextEntryIndex = 0;
  const workerCount = Math.min(
    MISSING_ENTRY_RECOVERY_CONCURRENCY,
    entries.length
  );

  const recoverNextEntry = async (): Promise<void> => {
    while (nextEntryIndex < entries.length) {
      const entryIndex = nextEntryIndex;
      nextEntryIndex += 1;
      const entry = entries[entryIndex];
      if (!entry) {
        continue;
      }
      recoveredTexts[entryIndex] = await retryMissingEntry(entry);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, recoverNextEntry));

  return recoveredTexts;
};

export const buildStructuredBatchText = (
  entries: readonly StructuredBatchEntry[]
): string =>
  entries
    .map(
      (entry) =>
        `${createBatchMarker(entry.entryId, "START")}\n${entry.protectedText}\n${createBatchMarker(entry.entryId, "END")}`
    )
    .join("\n\n");

export const resolveStructuredBatchTranslations = async (options: {
  readonly batchReportedPartialFallback: boolean;
  readonly entries: readonly StructuredBatchEntry[];
  readonly finalText: string;
  readonly glossaryProtector: GlossaryProtector;
  readonly retryMissingEntry: (
    entry: StructuredBatchEntry
  ) => Promise<string | null>;
  readonly targetLanguage: string;
}): Promise<{
  readonly partialFallbackTranslationCount: number;
  readonly translatedEntries: Record<string, string>;
}> => {
  const translatedEntries: Record<string, string> = {};
  const missingEntries: StructuredBatchEntry[] = [];

  for (const entry of options.entries) {
    const match = new RegExp(
      `${escapeRegExp(createBatchMarker(entry.entryId, "START"))}\\s*([\\s\\S]*?)\\s*${escapeRegExp(createBatchMarker(entry.entryId, "END"))}`
    ).exec(options.finalText);
    const restoredText = match
      ? options.glossaryProtector.restore(
          match[1]?.trim() ?? "",
          options.targetLanguage,
          entry.tokens
        )
      : "";

    if (!hasUsableLocalizedText(restoredText)) {
      missingEntries.push(entry);
      continue;
    }

    for (const messageId of entry.messageIds) {
      translatedEntries[messageId] = restoredText;
    }
  }

  let unresolvedMissingEntryCount = 0;
  const recoveredMissingTexts = await recoverMissingEntries(
    missingEntries,
    options.retryMissingEntry
  );
  for (const [index, entry] of missingEntries.entries()) {
    const recoveredText = recoveredMissingTexts[index] ?? null;
    const translatedText = recoveredText ?? entry.sourceText;
    if (!recoveredText) {
      unresolvedMissingEntryCount += 1;
    }
    for (const messageId of entry.messageIds) {
      translatedEntries[messageId] = translatedText;
    }
  }

  return {
    translatedEntries,
    partialFallbackTranslationCount:
      unresolvedMissingEntryCount +
      (options.batchReportedPartialFallback &&
      (unresolvedMissingEntryCount > 0 || missingEntries.length === 0)
        ? 1
        : 0),
  };
};

export const recoverMissingStructuredEntry = async (options: {
  readonly entry: StructuredBatchEntry;
  readonly glossaryProtector: GlossaryProtector;
  readonly targetLanguage: string;
  readonly translateEntry: () => Promise<TranslationResult>;
}): Promise<string | null> => {
  const translationResult = await options.translateEntry();

  if (translationResult.status !== "translated") {
    return null;
  }

  const restoredText = options.glossaryProtector.restore(
    translationResult.finalText,
    options.targetLanguage,
    options.entry.tokens
  );

  if (
    !hasUsableLocalizedText(restoredText) ||
    restoredText.includes(LOCALIZATION_BATCH_MARKER_PREFIX)
  ) {
    return null;
  }

  return restoredText;
};
