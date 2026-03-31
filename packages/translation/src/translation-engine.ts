import type {
  TranslationReporter,
  TranslationRequest,
  TranslationResult,
} from "./translation-contract";

export interface NormalizedTranslationRequest extends TranslationRequest {
  readonly category: string;
  readonly engineId: string;
  readonly timeoutMs: number;
}

export interface TranslationEngine {
  readonly id: string;
  translate(request: NormalizedTranslationRequest): Promise<TranslationResult>;
}

export interface TranslationFacadeOptions {
  readonly defaultEngineId?: string;
  readonly engines?: readonly TranslationEngine[];
  readonly reporter?: TranslationReporter;
}
