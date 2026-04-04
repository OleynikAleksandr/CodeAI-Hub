import type {
  LocalizationCategoryId,
  LocalizationEngineLanguageCatalog,
  LocalizationRuntimePayload,
} from "../../../../../packages/localization/src/localization-contract";
import type { LocalizationRuntimeBootstrapSnapshot } from "../../../../../packages/localization/src/localization-runtime-bootstrap-store";

export type LocalizationVariables = Readonly<Record<string, number | string>>;
export type BrowserLocalizationCategoryId = LocalizationCategoryId;
export type BrowserLocalizationBootstrapSnapshot =
  LocalizationRuntimeBootstrapSnapshot | null;

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

declare global {
  interface Window {
    __CODEAI_LOCALIZATION_BOOTSTRAP__?: BrowserLocalizationBootstrapSnapshot;
  }
}

export const readBrowserLocalizationBootstrapSnapshot =
  (): BrowserLocalizationBootstrapSnapshot =>
    window.__CODEAI_LOCALIZATION_BOOTSTRAP__ ?? null;
