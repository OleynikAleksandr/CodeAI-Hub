import assert from "node:assert/strict";
import test from "node:test";
import { SessionMessageLocalizationProjector } from "./session-message-localization-projector";
import { computeSessionMessageSourceHash } from "./session-message-source-hash";

test("SessionMessageLocalizationProjector returns localized content for matching source hash", () => {
  const projector = new SessionMessageLocalizationProjector();
  const content = "Commencing initial action";

  const localizedContent = projector.resolveLocalizedContent({
    message: {
      id: "message-1",
      content,
    },
    translations: new Map([
      [
        "message-1",
        {
          messageId: "message-1",
          sourceHash: computeSessionMessageSourceHash(content),
          targetLanguage: "ru",
          timestamp: "2026-04-13T08:06:44.725Z",
          translatedContent: "Начинаю первое действие",
        },
      ],
    ]),
  });

  assert.equal(localizedContent, "Начинаю первое действие");
});

test("SessionMessageLocalizationProjector ignores stale translations with mismatched source hash", () => {
  const projector = new SessionMessageLocalizationProjector();

  const localizedContent = projector.resolveLocalizedContent({
    message: {
      id: "message-1",
      content: "Updated reasoning body",
    },
    translations: new Map([
      [
        "message-1",
        {
          messageId: "message-1",
          sourceHash: computeSessionMessageSourceHash("Old reasoning body"),
          targetLanguage: "ru",
          timestamp: "2026-04-13T08:06:44.725Z",
          translatedContent: "Старый перевод",
        },
      ],
    ]),
  });

  assert.equal(localizedContent, null);
});
