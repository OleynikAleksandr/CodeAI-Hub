export type TranslationStatus = "translated" | "fallback" | "skipped";

export type TranslationCategory = "reasoning" | "generic" | "document";
export type TranslationChunkingMode = "auto" | "disabled";

export interface TranslationChunkPolicy {
  readonly hardCharacterLimit: number;
  readonly mode: TranslationChunkingMode;
  readonly softCharacterLimit: number;
}

export interface TranslationEngineProfile {
  readonly chunkPolicy: TranslationChunkPolicy;
  readonly engineId: string;
}

export interface TranslationRequest {
  readonly category?: TranslationCategory | string;
  readonly chunkingMode?: TranslationChunkingMode;
  readonly engineId?: string;
  readonly providerId?: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly text: string;
  readonly timeoutMs?: number;
}

export interface TranslationResult {
  readonly engine: string;
  readonly errorCode?: string;
  readonly finalText: string;
  readonly originalText: string;
  readonly sourceLanguage: string;
  readonly status: TranslationStatus;
  readonly targetLanguage: string;
  readonly translatedText: string | null;
}

export interface TranslationReporter {
  readonly info?: (message: string, metadata?: Record<string, unknown>) => void;
  readonly warn?: (message: string, metadata?: Record<string, unknown>) => void;
}
