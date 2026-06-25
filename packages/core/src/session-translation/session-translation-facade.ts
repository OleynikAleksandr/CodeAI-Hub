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
const CYRILLIC_CHARACTER_PATTERN = /[А-Яа-яЁё]/gu;
const LATIN_CODE_TOKEN_PATTERN = /[./_-]|\d/u;
const LATIN_TOKEN_PATTERN = /[A-Za-z][A-Za-z0-9._/-]*/gu;
const RUSSIAN_LANGUAGE_PATTERN = /^ru(?:[-_]|$)/iu;
const RUSSIAN_SKIP_MIN_CYRILLIC_CHARACTERS = 40;
const RUSSIAN_SKIP_MAX_LATIN_PROSE_WORDS = 3;

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

interface SessionThinkingDisplayState {
  readonly translationState?: "pending";
  readonly visibilityAtEmission?: "visible" | "hidden";
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

const countMatches = (content: string, pattern: RegExp): number =>
  content.match(pattern)?.length ?? 0;

const countLatinProseWords = (content: string): number =>
  [...content.matchAll(LATIN_TOKEN_PATTERN)].filter(([token]) => {
    if (token.length < 3) {
      return false;
    }
    return !LATIN_CODE_TOKEN_PATTERN.test(token);
  }).length;

const shouldSkipAlreadyRussianReasoningTranslation = (
  content: string,
  targetLanguage: string
): boolean => {
  if (!RUSSIAN_LANGUAGE_PATTERN.test(targetLanguage)) {
    return false;
  }
  const cyrillicCharacters = countMatches(content, CYRILLIC_CHARACTER_PATTERN);
  if (cyrillicCharacters < RUSSIAN_SKIP_MIN_CYRILLIC_CHARACTERS) {
    return false;
  }
  return countLatinProseWords(content) <= RUSSIAN_SKIP_MAX_LATIN_PROSE_WORDS;
};

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

  resolveThinkingDisplayState(
    candidate: SessionTranslationDispatchCandidate & {
      readonly providerId?: SessionTranslationProviderId;
      readonly settingsPath?: string;
    }
  ): SessionThinkingDisplayState {
    const settingsPath = resolveCandidateSettingsPath(
      candidate,
      this.settingsPath
    );
    let visibilityAtEmission: "visible" | "hidden" | undefined;
    if (candidate.providerId) {
      visibilityAtEmission = this.policyResolver.resolveThinkingVisibility(
        settingsPath,
        candidate.providerId
      )
        ? "visible"
        : "hidden";
    }
    const baseState = visibilityAtEmission ? { visibilityAtEmission } : {};
    if (
      visibilityAtEmission === "hidden" ||
      !this.dispatcher.shouldTranslateDialogMessage(candidate)
    ) {
      return baseState;
    }
    const policy = this.policyResolver.resolve(
      settingsPath,
      resolveTranslationPolicyCategory(candidate)
    );
    if (
      !(policy.enabled && policy.targetLanguage) ||
      shouldSkipAlreadyRussianReasoningTranslation(
        candidate.content,
        policy.targetLanguage
      )
    ) {
      return baseState;
    }
    return { ...baseState, translationState: "pending" };
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

  private shouldSkipAlreadyTargetLanguageThinking(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly policy: ReturnType<SessionTranslationPolicyResolver["resolve"]>;
    readonly sourceHash: string;
    readonly targetLanguage: string;
    readonly thinkingCandidate: boolean;
  }): boolean {
    if (
      !(
        options.thinkingCandidate &&
        shouldSkipAlreadyRussianReasoningTranslation(
          options.candidate.content,
          options.targetLanguage
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
      sourceHash: options.sourceHash,
      contentLength: options.candidate.content.length,
      preview: buildLogPreview(options.candidate.content),
      engineId: options.policy.engineId,
      policyCategory: options.policy.category,
      skipReason: "already_target_language",
      targetLanguage: options.targetLanguage,
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
      this.shouldSkipAlreadyTargetLanguageThinking({
        candidate,
        policy,
        sourceHash,
        targetLanguage,
        thinkingCandidate,
      })
    ) {
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
