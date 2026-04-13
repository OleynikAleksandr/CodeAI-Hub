import type { AppendMessageTranslationOptions } from "@codeai-hub/unified-session";
import { computeSessionMessageSourceHash } from "./session-message-source-hash";

export interface LocalizableSessionMessage {
  readonly content: string;
  readonly id: string;
}

export class SessionMessageLocalizationProjector {
  resolveLocalizedContent(options: {
    readonly message: LocalizableSessionMessage;
    readonly translations: ReadonlyMap<string, AppendMessageTranslationOptions>;
  }): string | null {
    const translation = options.translations.get(options.message.id);
    if (!translation) {
      return null;
    }

    if (
      translation.sourceHash !==
      computeSessionMessageSourceHash(options.message.content)
    ) {
      return null;
    }

    const localizedContent = translation.translatedContent.trim();
    return localizedContent.length > 0 ? localizedContent : null;
  }
}
