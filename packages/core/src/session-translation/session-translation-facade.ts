import { TranslationFacade } from "@codeai-hub/translation";
import type { Logger } from "../telemetry/logger";
import { computeSessionMessageSourceHash } from "./session-message-source-hash";
import {
  type SessionTranslationDispatchCandidate,
  SessionTranslationDispatcher,
} from "./session-translation-dispatcher";
import {
  type SessionTranslationPolicy,
  SessionTranslationPolicyResolver,
} from "./session-translation-policy-resolver";

const TRANSLATION_TIMEOUT_MS = 3000;

export interface SessionTranslationFacadeOptions {
  readonly logger: Logger;
  readonly settingsPath: string;
}

export interface SessionMessageTranslationCandidate
  extends SessionTranslationDispatchCandidate {
  readonly messageId: string;
  readonly sessionId: string;
}

export interface SessionMessageTranslationResult {
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
  readonly translatedContent: string;
}

export class SessionTranslationFacade {
  private readonly dispatcher = new SessionTranslationDispatcher();
  private readonly logger: Logger;
  private readonly policy: SessionTranslationPolicy;
  private readonly translation = new TranslationFacade();

  constructor(options: SessionTranslationFacadeOptions) {
    this.logger = options.logger;
    this.policy = new SessionTranslationPolicyResolver().resolve(
      options.settingsPath
    );
  }

  shouldTranslateDialogMessage(
    candidate: SessionTranslationDispatchCandidate
  ): boolean {
    return (
      this.policy.enabled &&
      this.dispatcher.shouldTranslateDialogMessage(candidate)
    );
  }

  async translateDialogMessage(
    candidate: SessionMessageTranslationCandidate
  ): Promise<SessionMessageTranslationResult | null> {
    if (!this.shouldTranslateDialogMessage(candidate)) {
      return null;
    }
    if (!this.policy.targetLanguage) {
      return null;
    }

    const result = await this.translation.translate({
      category: "reasoning",
      engineId: this.policy.engineId,
      sourceLanguage: this.policy.sourceLanguage,
      targetLanguage: this.policy.targetLanguage,
      text: candidate.content,
      timeoutMs: TRANSLATION_TIMEOUT_MS,
    });
    if (result.status !== "translated") {
      this.logger.warn("Session translation returned non-translated result", {
        sessionId: candidate.sessionId,
        messageId: candidate.messageId,
        status: result.status,
        errorCode: result.errorCode,
      });
      return null;
    }

    const translatedContent = result.finalText.trim();
    if (translatedContent.length === 0) {
      return null;
    }

    return {
      sessionId: candidate.sessionId,
      messageId: candidate.messageId,
      sourceHash: computeSessionMessageSourceHash(candidate.content),
      targetLanguage: this.policy.targetLanguage,
      translatedContent,
    };
  }
}
