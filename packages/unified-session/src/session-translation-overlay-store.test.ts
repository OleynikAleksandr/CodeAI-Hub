import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSessionTranslationFilePath,
  readSessionTranslationOverlayMap,
  SessionTranslationOverlayWriter,
} from "./session-translation-overlay-store";

const TRANSLATION_FILE_PATH_PATTERN = /session-1\.translations\.jsonl$/;

test("readSessionTranslationOverlayMap keeps the latest translation per message id", async () => {
  const rootDirectory = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-translation-overlay-")
  );
  const options = {
    rootDirectory,
    workspaceSlug: "workspace-alpha",
    provider: "codexCli",
    sessionId: "session-1",
  };

  try {
    const writer = new SessionTranslationOverlayWriter(options);
    await writer.appendTranslation(
      {
        messageId: "message-1",
        sourceHash: "hash-1",
        targetLanguage: "ru",
        translatedContent: "Первый вариант",
      },
      true
    );
    await writer.appendTranslation(
      {
        messageId: "message-1",
        sourceHash: "hash-1",
        targetLanguage: "ru",
        translatedContent: "Финальный вариант",
      },
      true
    );
    await writer.appendTranslation(
      {
        messageId: "message-2",
        sourceHash: "hash-2",
        targetLanguage: "ru",
        translatedContent: "Вторая мысль",
      },
      true
    );
    await writer.close();

    const filePath = buildSessionTranslationFilePath(options);
    const overlays = await readSessionTranslationOverlayMap(filePath);

    assert.match(filePath, TRANSLATION_FILE_PATH_PATTERN);
    assert.equal(overlays.size, 2);
    assert.equal(
      overlays.get("message-1")?.translatedContent,
      "Финальный вариант"
    );
    assert.equal(overlays.get("message-2")?.targetLanguage, "ru");
  } finally {
    await rm(rootDirectory, { recursive: true, force: true });
  }
});
