import {
  TranslationFacade,
  type TranslationReporter,
} from "@codeai-hub/translation";
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
const TRANSLATION_PREVIEW_LENGTH = 160;

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

const isThinkingTranslationCandidate = (
  candidate: SessionTranslationDispatchCandidate
): boolean =>
  candidate.role === "thinking" ||
  (candidate.role === "assistant" && candidate.tag === "thinking");

const buildLogPreview = (content: string): string => {
  const normalized = content.replace(/\s+/gu, " ").trim();
  if (normalized.length <= TRANSLATION_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, TRANSLATION_PREVIEW_LENGTH)}...`;
};

export class SessionTranslationFacade {
  private readonly dispatcher = new SessionTranslationDispatcher();
  private readonly logger: Logger;
  private readonly policy: SessionTranslationPolicy;

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

  private createTranslationReporter(
    candidate: SessionMessageTranslationCandidate,
    sourceHash: string
  ): TranslationReporter {
    const baseMetadata = {
      messageId: candidate.messageId,
      role: candidate.role,
      sessionId: candidate.sessionId,
      sourceHash,
      tag: candidate.tag,
    };

    return {
      info: (message: string, metadata?: Record<string, unknown>) => {
        this.logger.info(message, {
          ...baseMetadata,
          ...metadata,
        });
      },
      warn: (message: string, metadata?: Record<string, unknown>) => {
        this.logger.warn(message, {
          ...baseMetadata,
          ...metadata,
        });
      },
    };
  }

  async translateDialogMessage(
    candidate: SessionMessageTranslationCandidate
  ): Promise<SessionMessageTranslationResult | null> {
    const thinkingCandidate = isThinkingTranslationCandidate(candidate);
    const dispatcherAccepted =
      this.dispatcher.shouldTranslateDialogMessage(candidate);
    if (!(this.policy.enabled && dispatcherAccepted)) {
      if (thinkingCandidate) {
        this.logger.info("Session translation skipped before dispatch", {
          sessionId: candidate.sessionId,
          messageId: candidate.messageId,
          role: candidate.role,
          tag: candidate.tag,
          contentLength: candidate.content.length,
          preview: buildLogPreview(candidate.content),
          policyEnabled: this.policy.enabled,
          dispatcherAccepted,
          engineId: this.policy.engineId,
          targetLanguage: this.policy.targetLanguage,
          skipReason: this.policy.enabled
            ? "dispatcher_rejected"
            : "policy_disabled",
        });
      }
      return null;
    }
    if (!this.policy.targetLanguage) {
      if (thinkingCandidate) {
        this.logger.info("Session translation skipped before dispatch", {
          sessionId: candidate.sessionId,
          messageId: candidate.messageId,
          role: candidate.role,
          tag: candidate.tag,
          contentLength: candidate.content.length,
          preview: buildLogPreview(candidate.content),
          policyEnabled: this.policy.enabled,
          dispatcherAccepted,
          engineId: this.policy.engineId,
          targetLanguage: this.policy.targetLanguage,
          skipReason: "missing_target_language",
        });
      }
      return null;
    }

    const sourceHash = computeSessionMessageSourceHash(candidate.content);
    this.logger.info("Session translation dispatch started", {
      sessionId: candidate.sessionId,
      messageId: candidate.messageId,
      role: candidate.role,
      tag: candidate.tag,
      sourceHash,
      contentLength: candidate.content.length,
      preview: buildLogPreview(candidate.content),
      engineId: this.policy.engineId,
      targetLanguage: this.policy.targetLanguage,
      timeoutMs: TRANSLATION_TIMEOUT_MS,
    });

    const translation = new TranslationFacade({
      reporter: this.createTranslationReporter(candidate, sourceHash),
    });
    const result = await translation.translate({
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
        role: candidate.role,
        tag: candidate.tag,
        sourceHash,
        contentLength: candidate.content.length,
        preview: buildLogPreview(candidate.content),
        requestedEngineId: this.policy.engineId,
        resolvedEngineId: result.engine,
        targetLanguage: this.policy.targetLanguage,
        timeoutMs: TRANSLATION_TIMEOUT_MS,
        status: result.status,
        errorCode: result.errorCode,
      });
      return null;
    }

    const translatedContent = result.finalText.trim();
    if (translatedContent.length === 0) {
      this.logger.warn(
        "Session translation produced empty translated content",
        {
          sessionId: candidate.sessionId,
          messageId: candidate.messageId,
          role: candidate.role,
          tag: candidate.tag,
          sourceHash,
          contentLength: candidate.content.length,
          preview: buildLogPreview(candidate.content),
          requestedEngineId: this.policy.engineId,
          resolvedEngineId: result.engine,
          targetLanguage: this.policy.targetLanguage,
        }
      );
      return null;
    }

    this.logger.info("Session translation completed", {
      sessionId: candidate.sessionId,
      messageId: candidate.messageId,
      role: candidate.role,
      tag: candidate.tag,
      sourceHash,
      sourceLength: candidate.content.length,
      translatedLength: translatedContent.length,
      preview: buildLogPreview(candidate.content),
      requestedEngineId: this.policy.engineId,
      resolvedEngineId: result.engine,
      targetLanguage: this.policy.targetLanguage,
      timeoutMs: TRANSLATION_TIMEOUT_MS,
    });

    return {
      sessionId: candidate.sessionId,
      messageId: candidate.messageId,
      sourceHash,
      targetLanguage: this.policy.targetLanguage,
      translatedContent,
    };
  }
}
