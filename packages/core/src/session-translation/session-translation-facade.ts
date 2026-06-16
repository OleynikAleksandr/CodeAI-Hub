import type {
  TranslationFacade,
  TranslationReporter,
} from "@codeai-hub/translation";
import type { Logger } from "../telemetry/logger";
import { createCoreTranslationFacade } from "../translation/core-translation-facade-factory";
import { computeSessionMessageSourceHash } from "./session-message-source-hash";
import {
  type SessionTranslationDispatchCandidate,
  SessionTranslationDispatcher,
} from "./session-translation-dispatcher";
import { runSessionTranslationJob } from "./session-translation-job-runner";
import {
  type SessionTranslationPolicyCategory,
  SessionTranslationPolicyResolver,
} from "./session-translation-policy-resolver";

const TRANSLATION_PREVIEW_LENGTH = 160;
const TRANSLATION_TIMEOUT_BASE_MS = 15_000;
const TRANSLATION_TIMEOUT_MAX_MS = 30_000;
const TRANSLATION_TIMEOUT_PER_CHARACTER_MS = 8;
const CYRILLIC_CHARACTER_PATTERN = /[\u0400-\u052f]/u;
const RUSSIAN_LANGUAGE_CODES = new Set(["ru", "ru-ru"]);

export type SessionTranslationFacadeFactory = (options: {
  readonly reporter?: TranslationReporter;
}) => TranslationFacade;

export interface SessionTranslationFacadeOptions {
  readonly logger: Logger;
  readonly settingsPath: string;
  readonly translationFacadeFactory?: SessionTranslationFacadeFactory;
}

export type SessionTranslationProviderId =
  | "claude"
  | "codex"
  | "gemini"
  | "kimi"
  | "glmOpenCode";

export interface SessionMessageTranslationCandidate
  extends SessionTranslationDispatchCandidate {
  readonly messageId: string;
  readonly providerId?: SessionTranslationProviderId;
  readonly sessionId: string;
  readonly settingsPath?: string;
}

export interface SessionMessageTranslationResult {
  readonly messageId: string;
  readonly sessionId: string;
  readonly sourceHash: string;
  readonly targetLanguage: string;
  readonly translatedContent: string;
}

const resolveCandidateSettingsPath = (
  candidate: Pick<SessionMessageTranslationCandidate, "settingsPath">,
  fallback: string
): string => candidate.settingsPath ?? fallback;

const isThinkingTranslationCandidate = (
  candidate: SessionTranslationDispatchCandidate
): boolean =>
  candidate.role === "thinking" ||
  (candidate.role === "assistant" && candidate.tag === "thinking");

const resolveTranslationPolicyCategory = (
  _candidate: SessionTranslationDispatchCandidate
): SessionTranslationPolicyCategory => "reasoning";

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

const shouldSkipTranslationForTargetLanguage = (
  text: string,
  targetLanguage: string
): boolean =>
  RUSSIAN_LANGUAGE_CODES.has(targetLanguage) &&
  CYRILLIC_CHARACTER_PATTERN.test(text);

const defaultTranslationFacadeFactory: SessionTranslationFacadeFactory = (
  options
) => createCoreTranslationFacade({ reporter: options.reporter });

export class SessionTranslationFacade {
  private readonly dispatcher = new SessionTranslationDispatcher();
  private readonly inFlightTranslations = new Map<
    string,
    Promise<string | null>
  >();
  private readonly logger: Logger;
  private readonly policyResolver = new SessionTranslationPolicyResolver();
  private readonly settingsPath: string;
  private readonly translationFacadeFactory: SessionTranslationFacadeFactory;

  constructor(options: SessionTranslationFacadeOptions) {
    this.logger = options.logger;
    this.settingsPath = options.settingsPath;
    this.translationFacadeFactory =
      options.translationFacadeFactory ?? defaultTranslationFacadeFactory;
  }

  shouldTranslateDialogMessage(
    candidate: SessionTranslationDispatchCandidate
  ): boolean {
    return this.dispatcher.shouldTranslateDialogMessage(candidate);
  }

  resolveThinkingVisibilityForProvider(
    providerId: SessionTranslationProviderId,
    settingsPath?: string
  ): boolean {
    return this.policyResolver.resolveThinkingVisibility(
      settingsPath ?? this.settingsPath,
      providerId
    );
  }

  private createTranslationReporter(
    candidate: Pick<
      SessionMessageTranslationCandidate,
      "messageId" | "role" | "sessionId" | "tag"
    >,
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

  private buildTranslationResult(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly sourceHash: string;
    readonly targetLanguage: string;
    readonly translatedContent: string;
  }): SessionMessageTranslationResult {
    return {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      sourceHash: options.sourceHash,
      targetLanguage: options.targetLanguage,
      translatedContent: options.translatedContent,
    };
  }

  private logPolicySkip(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly dispatcherAccepted: boolean;
    readonly policy: ReturnType<SessionTranslationPolicyResolver["resolve"]>;
    readonly queueWaitMs: number;
    readonly thinkingCandidate: boolean;
  }): void {
    if (!options.thinkingCandidate) {
      return;
    }
    this.logger.info("Session translation skipped before dispatch", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      contentLength: options.candidate.content.length,
      preview: buildLogPreview(options.candidate.content),
      policyEnabled: options.policy.enabled,
      dispatcherAccepted: options.dispatcherAccepted,
      engineId: options.policy.engineId,
      targetLanguage: options.policy.targetLanguage,
      skipReason: options.policy.skipReason ?? "policy_disabled",
      queueWaitMs: options.queueWaitMs,
    });
  }

  private logAlreadyLocalizedSkip(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly dispatcherAccepted: boolean;
    readonly engineId: string;
    readonly targetLanguage: string;
  }): void {
    this.logger.info("Session translation skipped before dispatch", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      contentLength: options.candidate.content.length,
      preview: buildLogPreview(options.candidate.content),
      policyEnabled: true,
      dispatcherAccepted: options.dispatcherAccepted,
      engineId: options.engineId,
      targetLanguage: options.targetLanguage,
      skipReason: "already_localized_for_target_language",
    });
  }

  private shouldSkipThinkingVisibility(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly dispatcherAccepted: boolean;
    readonly settingsPath: string;
    readonly thinkingCandidate: boolean;
  }): boolean {
    if (
      !(
        options.thinkingCandidate &&
        options.candidate.providerId &&
        !this.policyResolver.resolveThinkingVisibility(
          options.settingsPath,
          options.candidate.providerId
        )
      )
    ) {
      return false;
    }
    this.logger.info("Session translation skipped before dispatch", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      contentLength: options.candidate.content.length,
      preview: buildLogPreview(options.candidate.content),
      dispatcherAccepted: options.dispatcherAccepted,
      providerId: options.candidate.providerId,
      skipReason: "thinking_visibility_disabled",
    });
    return true;
  }

  async translateDialogMessage(
    candidate: SessionMessageTranslationCandidate
  ): Promise<SessionMessageTranslationResult | null> {
    const settingsPath = resolveCandidateSettingsPath(
      candidate,
      this.settingsPath
    );
    const thinkingCandidate = isThinkingTranslationCandidate(candidate);
    const dispatcherAccepted =
      this.dispatcher.shouldTranslateDialogMessage(candidate);
    if (
      this.shouldSkipThinkingVisibility({
        candidate,
        dispatcherAccepted,
        settingsPath,
        thinkingCandidate,
      })
    ) {
      return null;
    }
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
    const policy = this.policyResolver.resolve(
      settingsPath,
      resolveTranslationPolicyCategory(candidate)
    );
    const dedupeKey =
      policy.enabled && policy.targetLanguage
        ? `${policy.category}::${policy.engineId}::${policy.targetLanguage}::${sourceHash}`
        : null;
    const queuedAt = Date.now();
    const queuedSnapshot = this.dispatcher.snapshot();
    const timeoutMs = resolveTranslationTimeoutMs(candidate.content);

    if (!(policy.enabled && policy.targetLanguage)) {
      this.logPolicySkip({
        candidate,
        dispatcherAccepted,
        policy,
        queueWaitMs: 0,
        thinkingCandidate,
      });
      return null;
    }
    const targetLanguage = policy.targetLanguage;

    if (
      shouldSkipTranslationForTargetLanguage(candidate.content, targetLanguage)
    ) {
      this.logAlreadyLocalizedSkip({
        candidate,
        dispatcherAccepted,
        engineId: policy.engineId,
        targetLanguage,
      });
      return null;
    }

    if (dedupeKey) {
      const inFlightTranslation = this.inFlightTranslations.get(dedupeKey);
      if (inFlightTranslation) {
        this.logger.info("Session translation reused in-flight result", {
          sessionId: candidate.sessionId,
          messageId: candidate.messageId,
          role: candidate.role,
          tag: candidate.tag,
          sourceHash,
          contentLength: candidate.content.length,
          preview: buildLogPreview(candidate.content),
          engineId: policy.engineId,
          policyCategory: policy.category,
          targetLanguage: policy.targetLanguage,
        });
        const translatedContent = await inFlightTranslation;
        if (!translatedContent) {
          return null;
        }
        return this.buildTranslationResult({
          candidate,
          sourceHash,
          targetLanguage,
          translatedContent,
        });
      }
    }

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
      policyCategory: policy.category,
      timeoutMs,
    });

    const preview = buildLogPreview(candidate.content);
    const translationPromise = this.dispatcher.dispatch(() =>
      runSessionTranslationJob({
        candidate,
        createTranslationReporter: (jobCandidate, jobSourceHash) =>
          this.createTranslationReporter(
            jobCandidate as SessionMessageTranslationCandidate,
            jobSourceHash
          ),
        dispatcherSnapshot: this.dispatcher.snapshot(),
        logger: this.logger,
        policy: {
          category: policy.category,
          engineId: policy.engineId,
          sourceLanguage: policy.sourceLanguage,
          targetLanguage,
        },
        preview,
        queuedAt,
        sourceHash,
        timeoutMs,
        translationFacadeFactory: this.translationFacadeFactory,
      })
    );

    if (dedupeKey) {
      this.inFlightTranslations.set(dedupeKey, translationPromise);
    }

    try {
      const translatedContent = await translationPromise;
      if (!translatedContent) {
        return null;
      }
      return this.buildTranslationResult({
        candidate,
        sourceHash,
        targetLanguage,
        translatedContent,
      });
    } finally {
      if (
        dedupeKey &&
        this.inFlightTranslations.get(dedupeKey) === translationPromise
      ) {
        this.inFlightTranslations.delete(dedupeKey);
      }
    }
  }
}
