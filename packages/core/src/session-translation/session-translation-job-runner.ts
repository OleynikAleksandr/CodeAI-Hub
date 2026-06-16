import type {
  TranslationFacade,
  TranslationReporter,
} from "@codeai-hub/translation";
import { resolveTranslationRuntimeMetadata } from "../translation/claude-haiku-translation-engine";

const LOCALIZATION_MARKER_PREFIX = "__CODEAI_HUB_LOCALIZATION_ENTRY__";

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

interface TranslationCandidateLike {
  readonly content: string;
  readonly messageId: string;
  readonly role: string;
  readonly sessionId: string;
  readonly tag?: string;
}

interface TranslationPolicyLike {
  readonly category: string;
  readonly engineId: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
}

interface DispatcherSnapshotLike {
  readonly activeJobs: number;
  readonly maxConcurrentJobs: number;
  readonly pendingJobs: number;
}

export interface RunSessionTranslationJobOptions {
  readonly candidate: TranslationCandidateLike;
  readonly createTranslationReporter: (
    candidate: TranslationCandidateLike,
    sourceHash: string
  ) => TranslationReporter;
  readonly dispatcherSnapshot: DispatcherSnapshotLike;
  readonly logger: {
    readonly info: (message: string, context?: Record<string, unknown>) => void;
    readonly warn: (message: string, context?: Record<string, unknown>) => void;
  };
  readonly policy: TranslationPolicyLike;
  readonly preview: string;
  readonly queuedAt: number;
  readonly sourceHash: string;
  readonly timeoutMs: number;
  readonly translationFacadeFactory: (options: {
    readonly reporter?: TranslationReporter;
  }) => TranslationFacade;
}

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

export const runSessionTranslationJob = async (
  options: RunSessionTranslationJobOptions
): Promise<string | null> => {
  options.logger.info("Session translation dispatch started", {
    sessionId: options.candidate.sessionId,
    messageId: options.candidate.messageId,
    role: options.candidate.role,
    tag: options.candidate.tag,
    sourceHash: options.sourceHash,
    contentLength: options.candidate.content.length,
    preview: options.preview,
    engineId: options.policy.engineId,
    policyCategory: options.policy.category,
    targetLanguage: options.policy.targetLanguage,
    timeoutMs: options.timeoutMs,
    queueWaitMs: Date.now() - options.queuedAt,
    ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
    ...options.dispatcherSnapshot,
  });

  const translation = options.translationFacadeFactory({
    reporter: options.createTranslationReporter(
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
    options.logger.warn("Session translation returned non-translated result", {
      sessionId: options.candidate.sessionId,
      messageId: options.candidate.messageId,
      role: options.candidate.role,
      tag: options.candidate.tag,
      sourceHash: options.sourceHash,
      contentLength: options.candidate.content.length,
      preview: options.preview,
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
    options.logger.warn(
      "Session translation produced empty translated content",
      {
        sessionId: options.candidate.sessionId,
        messageId: options.candidate.messageId,
        role: options.candidate.role,
        tag: options.candidate.tag,
        sourceHash: options.sourceHash,
        contentLength: options.candidate.content.length,
        preview: options.preview,
        requestedEngineId: options.policy.engineId,
        policyCategory: options.policy.category,
        resolvedEngineId: result.engine,
        targetLanguage: options.policy.targetLanguage,
        ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
        ...buildRuntimeMetadataLogFields("resolved", result.engine),
      }
    );
    return null;
  }

  if (translatedContent.includes(LOCALIZATION_MARKER_PREFIX)) {
    options.logger.warn(
      "Session translation discarded marker-corrupted output",
      {
        sessionId: options.candidate.sessionId,
        messageId: options.candidate.messageId,
        role: options.candidate.role,
        tag: options.candidate.tag,
        sourceHash: options.sourceHash,
        contentLength: options.candidate.content.length,
        preview: options.preview,
        requestedEngineId: options.policy.engineId,
        policyCategory: options.policy.category,
        resolvedEngineId: result.engine,
        targetLanguage: options.policy.targetLanguage,
        timeoutMs: options.timeoutMs,
        ...buildRuntimeMetadataLogFields("requested", options.policy.engineId),
        ...buildRuntimeMetadataLogFields("resolved", result.engine),
      }
    );
    return null;
  }

  options.logger.info("Session translation completed", {
    sessionId: options.candidate.sessionId,
    messageId: options.candidate.messageId,
    role: options.candidate.role,
    tag: options.candidate.tag,
    sourceHash: options.sourceHash,
    sourceLength: options.candidate.content.length,
    translatedLength: translatedContent.length,
    preview: options.preview,
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
};
