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
import { SessionTranslationPolicyResolver } from "./session-translation-policy-resolver";

const TRANSLATION_PREVIEW_LENGTH = 160;
const TRANSLATION_TIMEOUT_BASE_MS = 5000;
const TRANSLATION_TIMEOUT_MAX_MS = 30_000;
const TRANSLATION_TIMEOUT_PER_CHARACTER_MS = 8;

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

const resolveTranslationTimeoutMs = (content: string): number =>
  Math.min(
    TRANSLATION_TIMEOUT_MAX_MS,
    TRANSLATION_TIMEOUT_BASE_MS +
      content.length * TRANSLATION_TIMEOUT_PER_CHARACTER_MS
  );

export class SessionTranslationFacade {
  private readonly dispatcher = new SessionTranslationDispatcher();
  private readonly logger: Logger;
  private readonly policyResolver = new SessionTranslationPolicyResolver();
  private readonly settingsPath: string;

  constructor(options: SessionTranslationFacadeOptions) {
    this.logger = options.logger;
    this.settingsPath = options.settingsPath;
  }

  shouldTranslateDialogMessage(
    candidate: SessionTranslationDispatchCandidate
  ): boolean {
    return this.dispatcher.shouldTranslateDialogMessage(candidate);
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
    if (!dispatcherAccepted) {
      if (thinkingCandidate) {
        this.logger.info("Session translation skipped before dispatch", {
          sessionId: candidate.sessionId,
          messageId: candidate.messageId,
          role: candidate.role,
          tag: candidate.tag,
          contentLength: candidate.content.length,
          preview: buildLogPreview(candidate.content),
          policyEnabled: true,
          dispatcherAccepted,
          engineId: null,
          targetLanguage: null,
          skipReason: "dispatcher_rejected",
        });
      }
      return null;
    }

    const sourceHash = computeSessionMessageSourceHash(candidate.content);
    const queuedAt = Date.now();
    const queuedSnapshot = this.dispatcher.snapshot();
    const timeoutMs = resolveTranslationTimeoutMs(candidate.content);
    this.logger.info("Session translation queued", {
      sessionId: candidate.sessionId,
      messageId: candidate.messageId,
      role: candidate.role,
      tag: candidate.tag,
      sourceHash,
      contentLength: candidate.content.length,
      preview: buildLogPreview(candidate.content),
      activeJobs: queuedSnapshot.activeJobs,
      pendingJobs: queuedSnapshot.pendingJobs,
      timeoutMs,
    });

    return await this.dispatcher.dispatch(async () => {
      const policy = this.policyResolver.resolve(this.settingsPath);
      if (!(policy.enabled && policy.targetLanguage)) {
        if (thinkingCandidate) {
          this.logger.info("Session translation skipped before dispatch", {
            sessionId: candidate.sessionId,
            messageId: candidate.messageId,
            role: candidate.role,
            tag: candidate.tag,
            contentLength: candidate.content.length,
            preview: buildLogPreview(candidate.content),
            policyEnabled: policy.enabled,
            dispatcherAccepted,
            engineId: policy.engineId,
            targetLanguage: policy.targetLanguage,
            skipReason: policy.skipReason ?? "policy_disabled",
            queueWaitMs: Date.now() - queuedAt,
          });
        }
        return null;
      }

      this.logger.info("Session translation dispatch started", {
        sessionId: candidate.sessionId,
        messageId: candidate.messageId,
        role: candidate.role,
        tag: candidate.tag,
        sourceHash,
        contentLength: candidate.content.length,
        preview: buildLogPreview(candidate.content),
        engineId: policy.engineId,
        targetLanguage: policy.targetLanguage,
        timeoutMs,
        queueWaitMs: Date.now() - queuedAt,
        ...this.dispatcher.snapshot(),
      });

      const translation = new TranslationFacade({
        reporter: this.createTranslationReporter(candidate, sourceHash),
      });
      const result = await translation.translate({
        category: "reasoning",
        engineId: policy.engineId,
        sourceLanguage: policy.sourceLanguage,
        targetLanguage: policy.targetLanguage,
        text: candidate.content,
        timeoutMs,
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
          requestedEngineId: policy.engineId,
          resolvedEngineId: result.engine,
          targetLanguage: policy.targetLanguage,
          timeoutMs,
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
            requestedEngineId: policy.engineId,
            resolvedEngineId: result.engine,
            targetLanguage: policy.targetLanguage,
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
        requestedEngineId: policy.engineId,
        resolvedEngineId: result.engine,
        targetLanguage: policy.targetLanguage,
        timeoutMs,
        queueWaitMs: Date.now() - queuedAt,
      });

      return {
        sessionId: candidate.sessionId,
        messageId: candidate.messageId,
        sourceHash,
        targetLanguage: policy.targetLanguage,
        translatedContent,
      };
    });
  }
}
