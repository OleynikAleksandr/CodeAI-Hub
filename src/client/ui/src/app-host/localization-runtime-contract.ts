import type {
  LocalizationCategoryId,
  LocalizationEngineLanguageCatalog,
  LocalizationRuntimePayload,
} from "../../../../../packages/localization/src/localization-contract";

export type LocalizationVariables = Readonly<Record<string, number | string>>;

export interface BrowserLocalizationRuntime {
  readonly activeEngineId: string | null;
  readonly availableEngines: readonly LocalizationEngineLanguageCatalog[];
  readonly configuredLanguageByCategory: Readonly<
    Record<LocalizationCategoryId, string>
  >;
  readonly ready: boolean;
  readonly t: (
    category: LocalizationCategoryId,
    messageId: string,
    fallback: string,
    variables?: LocalizationVariables
  ) => string;
}

export type BrowserLocalizationRuntimePayload =
  LocalizationRuntimePayload | null;
