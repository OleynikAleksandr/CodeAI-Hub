import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import type {
  LocalizationCategoryId,
  LocalizationSourceDictionaryEntries,
} from "../../../../../packages/localization/src/localization-contract";
import { BUNDLED_SOURCE_DICTIONARIES } from "../../../../../packages/localization/src/source-dictionary-registry";
import type { Settings } from "../components/settings/settings-state-model";

type LocalizationVariables = Readonly<Record<string, number | string>>;
type SettingsLocalizationCategoryKey =
  keyof Settings["general"]["localization"]["categories"];

interface LocalizationRuntime {
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

interface LocalizationProviderProps extends PropsWithChildren {
  readonly value: LocalizationRuntime;
}

const SOURCE_SELECTION = "source";
const EMPTY_SOURCE_ENTRIES: LocalizationSourceDictionaryEntries = {};

const LOCALIZATION_CATEGORY_BINDINGS = [
  {
    categoryId: "interactive_templates",
    settingsKey: "interactiveTemplates",
  },
  {
    categoryId: "system_feedback",
    settingsKey: "systemFeedback",
  },
  {
    categoryId: "ui_interface",
    settingsKey: "uiInterface",
  },
  {
    categoryId: "user_guidance",
    settingsKey: "userGuidance",
  },
  {
    categoryId: "workflow_terms",
    settingsKey: "workflowTerms",
  },
] as const satisfies readonly {
  readonly categoryId: LocalizationCategoryId;
  readonly settingsKey: SettingsLocalizationCategoryKey;
}[];

const BUNDLED_SOURCE_DICTIONARY_ENTRIES = new Map<
  LocalizationCategoryId,
  LocalizationSourceDictionaryEntries
>(
  BUNDLED_SOURCE_DICTIONARIES.map((dictionary) => [
    dictionary.category,
    dictionary.entries,
  ])
);

const normalizeConfiguredLanguage = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === SOURCE_SELECTION) {
    return SOURCE_SELECTION;
  }
  return trimmed;
};

const formatTemplate = (
  template: string,
  variables?: LocalizationVariables
): string => {
  if (!variables) {
    return template;
  }

  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const value = variables[key];
    return value === undefined ? match : String(value);
  });
};

const resolveConfiguredLanguageByCategory = (
  settings: Settings
): Record<LocalizationCategoryId, string> => {
  const configuredLanguageByCategory = {
    interactive_templates: SOURCE_SELECTION,
    system_feedback: SOURCE_SELECTION,
    ui_interface: SOURCE_SELECTION,
    user_guidance: SOURCE_SELECTION,
    workflow_terms: SOURCE_SELECTION,
  };

  for (const binding of LOCALIZATION_CATEGORY_BINDINGS) {
    configuredLanguageByCategory[binding.categoryId] =
      normalizeConfiguredLanguage(
        settings.general.localization.categories[binding.settingsKey]
      );
  }

  return configuredLanguageByCategory;
};

const createLocalizationRuntime = (settings: Settings): LocalizationRuntime => {
  const configuredLanguageByCategory =
    resolveConfiguredLanguageByCategory(settings);

  return {
    configuredLanguageByCategory,
    ready: true,
    t: (category, messageId, fallback, variables) => {
      // The webview currently ships only bundled source catalogs.
      // Materialized user-data bundles are wired in later through the host.
      const entries =
        BUNDLED_SOURCE_DICTIONARY_ENTRIES.get(category) ?? EMPTY_SOURCE_ENTRIES;
      const resolvedMessage = entries[messageId] ?? fallback;
      return formatTemplate(resolvedMessage, variables);
    },
  };
};

const DEFAULT_LOCALIZATION_RUNTIME: LocalizationRuntime = {
  configuredLanguageByCategory: {
    interactive_templates: SOURCE_SELECTION,
    system_feedback: SOURCE_SELECTION,
    ui_interface: SOURCE_SELECTION,
    user_guidance: SOURCE_SELECTION,
    workflow_terms: SOURCE_SELECTION,
  },
  ready: false,
  t: (_category, _messageId, fallback, variables) =>
    formatTemplate(fallback, variables),
};

const LocalizationContext = createContext<LocalizationRuntime>(
  DEFAULT_LOCALIZATION_RUNTIME
);

export const useResolvedLocalization = (
  settings: Settings
): LocalizationRuntime =>
  useMemo(() => createLocalizationRuntime(settings), [settings]);

export const LocalizationProvider = ({
  children,
  value,
}: LocalizationProviderProps) =>
  createElement(LocalizationContext.Provider, { value }, children);

export const useLocalization = (): LocalizationRuntime =>
  useContext(LocalizationContext);
