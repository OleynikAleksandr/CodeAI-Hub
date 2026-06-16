import type {
  TranslationFacade,
  TranslationReporter,
} from "@codeai-hub/translation";
import type { Logger } from "../telemetry/logger";
import { resolveTranslationRuntimeMetadata } from "../translation/claude-haiku-translation-engine";
import { createCoreTranslationFacade } from "../translation/core-translation-facade-factory";
import { computeSessionMessageSourceHash } from "./session-message-source-hash";
import {
  type SessionTranslationDispatchCandidate,
  SessionTranslationDispatcher,
} from "./session-translation-dispatcher";
import {
  type SessionTranslationPolicyCategory,
  SessionTranslationPolicyResolver,
} from "./session-translation-policy-resolver";

const TRANSLATION_PREVIEW_LENGTH = 160;
const TRANSLATION_TIMEOUT_BASE_MS = 15_000;
const TRANSLATION_TIMEOUT_MAX_MS = 30_000;
const TRANSLATION_TIMEOUT_PER_CHARACTER_MS = 8;

const APPLE_NATIVE_READINESS_ACTION_BY_ERROR_CODE: Readonly<
  Record<string, string>
> = {
  apple_native_helper_failed: "recheck_apple_translation_setup",
  apple_native_helper_unavailable: "build_or_install_apple_translation_helper",
  apple_native_language_pack_missing: "download_translation_languages",
  apple_native_language_pair_unsupported: "choose_supported_language_pair",
  apple_native_request_failed: "recheck_apple_translation_setup",
  apple_native_request_timeout: "recheck_apple_translation_setup",
  apple_native_requires_macos: "update_macos",
  apple_native_requires_macos_26: "update_macos_26",
  apple_native_requires_xcode: "install_xcode_26",
  supported_not_installed: "download_translation_languages",
  unsupported: "choose_supported_language_pair",
  xcode_not_ready: "install_xcode_26",
};

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

const resolveAppleNativeReadinessAction = (
  errorCode: string | undefined
): string | null =>
  errorCode
    ? (APPLE_NATIVE_READINESS_ACTION_BY_ERROR_CODE[errorCode] ?? null)
    : null;

const buildRuntimeMetadataLogFields = (
  prefix: "requested" | "resolved",
  engineId: string
): Record<string, unknown> => {
  const metadata = resolveTranslationRuntimeMetadata(engineId);
  return {
    [`${prefix}EngineModelId`]: metadata.modelId,
    [`${prefix}EnginePersistSession`]: metadata.persistSession,
    [`${prefix}EngineProjectSlug`]: metadata.projectSlug,
    [`${prefix}EngineProviderId`]: metadata.providerId,
    [`${prefix}EngineRuntimePath`]: metadata.runtimePath,
  };
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

  private async runTranslationJob(options: {
    readonly candidate: SessionMessageTranslationCandidate;
    readonly policy: ReturnType<SessionTranslationPolicyResolver["resolve"]> & {
      readonly enabled: true;
      readonly targetLanguage: string;
    };
    readonly queuedAt: number;
    readonly sourceHash: string;
    readonly timeoutMs: number;
  }): Promise<string | null> {
    this.logger.info("Session translation dispatch started", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      sourceHash: options.sourceHash,
      contentLength: options.candidate.content.length,
      preview: buildLogPreview(options.candidate.content),
      engineId: options.policy.engineId,
      policyCategory: options.policy.category,
      targetLanguage: options.policy.targetLanguage,
      timeoutMs: options.timeoutMs,
      queueWaitMs: Date.now() - options.queuedAt,
      ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
      ...this.dispatcher.snapshot(),
    });

    const translation = this.translationFacadeFactory({
      reporter: this.createTranslationReporter(
        options.candidate,
        options.sourceHash
      ),
    });
    const result = await translation.translate({
      category: options.policy.category,
      engineId: options.policy.engineId,
      sourceLanguage: options.policy.sourceLanguage,
      targetLanguage: options.policy.targetLanguage,
      text: options.candidate.content,
      timeoutMs: options.timeoutMs,
    });
    if (result.status !== "translated") {
      this.logger.warn("Session translation returned non-translated result", {
        sessionId: options.candidate.sessionId,
        messageId: options.candidate.messageId,
        role: options.candidate.role,
        tag: options.candidate.tag,
        sourceHash: options.sourceHash,
        contentLength: options.candidate.content.length,
        preview: buildLogPreview(options.candidate.content),
        requestedEngineId: options.policy.engineId,
        policyCategory: options.policy.category,
        resolvedEngineId: result.engine,
        targetLanguage: options.policy.targetLanguage,
        timeoutMs: options.timeoutMs,
        status: result.status,
        errorCode: result.errorCode,
        readinessAction: resolveAppleNativeReadinessAction(result.errorCode),
        ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
        ...buildRuntimeMetadataLogFields("resolved", result.engine),
      });
      return null;
    }

    const translatedContent = result.finalText.trim();
    if (translatedContent.length === 0) {
      this.logger.warn(
        "Session translation produced empty translated content",
        {
          sessionId: options.candidate.sessionId,
          messageId: options.candidate.messageId,
          role: options.candidate.role,
          tag: options.candidate.tag,
          sourceHash: options.sourceHash,
          contentLength: options.candidate.content.length,
          preview: buildLogPreview(options.candidate.content),
          requestedEngineId: options.policy.engineId,
          policyCategory: options.policy.category,
          resolvedEngineId: result.engine,
          targetLanguage: options.policy.targetLanguage,
          ...buildRuntimeMetadataLogFields(
            "requested",
            options.policy.engineId
          ),
          ...buildRuntimeMetadataLogFields("resolved", result.engine),
        }
      );
      return null;
    }

    this.logger.info("Session translation completed", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      sourceHash: options.sourceHash,
      sourceLength: options.candidate.content.length,
      translatedLength: translatedContent.length,
      preview: buildLogPreview(options.candidate.content),
      requestedEngineId: options.policy.engineId,
      policyCategory: options.policy.category,
      resolvedEngineId: result.engine,
      targetLanguage: options.policy.targetLanguage,
      timeoutMs: options.timeoutMs,
      queueWaitMs: Date.now() - options.queuedAt,
      ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
      ...buildRuntimeMetadataLogFields("resolved", result.engine),
    });

    return translatedContent;
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
      thinkingCandidate &&
      candidate.providerId &&
      !this.policyResolver.resolveThinkingVisibility(
        settingsPath,
        candidate.providerId
      )
    ) {
      this.logger.info("Session translation skipped before dispatch", {
        sessionId: candidate.sessionId,
        messageId: candidate.messageId,
        role: candidate.role,
        tag: candidate.tag,
        contentLength: candidate.content.length,
        preview: buildLogPreview(candidate.content),
        dispatcherAccepted,
        providerId: candidate.providerId,
        skipReason: "thinking_visibility_disabled",
      });
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

    const translationPromise = this.dispatcher.dispatch(() =>
      this.runTranslationJob({
        candidate,
        policy: {
          ...policy,
          enabled: true,
          targetLanguage,
        },
        queuedAt,
        sourceHash,
        timeoutMs,
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
