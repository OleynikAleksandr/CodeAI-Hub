import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveStructuredBatchTranslations,
  type StructuredBatchEntry,
  splitStructuredBatchEntries,
} from "./structured-batch-entry-recovery";

const createEntry = (entryId: number): StructuredBatchEntry => ({
  entryId,
  messageIds: [`message.${entryId}`],
  protectedText: `Source ${entryId}`,
  sourceText: `Source ${entryId}`,
  tokens: [],
});

test("missing structured entries recover with bounded concurrency", async () => {
  let activeRecoveries = 0;
  let maxActiveRecoveries = 0;
  const entries = Array.from({ length: 6 }, (_value, index) =>
    createEntry(index)
  );

  const result = await resolveStructuredBatchTranslations({
    batchReportedPartialFallback: false,
    entries,
    finalText: "",
    glossaryProtector: {
      restore: (text: string) => text,
    } as never,
    retryMissingEntry: async (entry) => {
      activeRecoveries += 1;
      maxActiveRecoveries = Math.max(maxActiveRecoveries, activeRecoveries);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeRecoveries -= 1;
      return `[ru] ${entry.sourceText}`;
    },
    targetLanguage: "ru",
  });

  assert.equal(result.partialFallbackTranslationCount, 0);
  assert.ok(maxActiveRecoveries > 1);
  assert.ok(maxActiveRecoveries <= 4);
  assert.equal(result.translatedEntries["message.5"], "[ru] Source 5");
});

test("structured batch planner respects entry and character limits", () => {
  const entries = Array.from({ length: 5 }, (_value, index) =>
    createEntry(index)
  );
  const entryLimited = splitStructuredBatchEntries(entries, {
    maxCharacters: 10_000,
    maxEntries: 2,
  });
  const characterLimited = splitStructuredBatchEntries(
    [
      { ...createEntry(0), protectedText: "short" },
      { ...createEntry(1), protectedText: "x".repeat(120) },
      { ...createEntry(2), protectedText: "tail" },
    ],
    { maxCharacters: 100, maxEntries: 10 }
  );

  assert.deepEqual(
    entryLimited.map((batch) => batch.map((entry) => entry.entryId)),
    [[0, 1], [2, 3], [4]]
  );
  assert.deepEqual(
    characterLimited.map((batch) => batch.map((entry) => entry.entryId)),
    [[0], [1], [2]]
  );
});
