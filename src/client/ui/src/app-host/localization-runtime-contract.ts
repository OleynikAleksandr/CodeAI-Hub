import type {
  LocalizationCategoryId,
  LocalizationEngineLanguageCatalog,
  LocalizationRuntimePayload,
} from "../../../../../packages/localization/src/localization-contract";

export type LocalizationVariables = Readonly<Record<string, number | string>>;
export type BrowserLocalizationCategoryId = LocalizationCategoryId;

export interface BrowserLocalizationRuntime {
  readonly activeEngineId: string | null;
  readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  readonly configuredLanguageByCategory: Readonly<
    Record<BrowserLocalizationCategoryId, string>
  >;
  readonly ready: boolean;
  readonly t: (
    category: BrowserLocalizationCategoryId,
    messageId: string,
    fallback: string,
    variables?: LocalizationVariables
  ) => string;
}

// This payload is intentionally user-facing only. Internal agent instructions
// never enter the browser localization runtime.
export type BrowserLocalizationRuntimePayload =
  LocalizationRuntimePayload | null;
