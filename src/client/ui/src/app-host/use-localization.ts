import {
  createContext,
  createElement,
  type PropsWithChildren,
  useContext,
  useMemo,
} from "react";
import type { LocalizationCategoryId } from "../../../../../packages/localization/src/localization-contract";
import type { Settings } from "../components/settings/settings-state-model";
import type {
  BrowserLocalizationRuntime,
  BrowserLocalizationRuntimePayload,
  LocalizationVariables,
} from "./localization-runtime-contract";

type SettingsLocalizationCategoryKey =
  keyof Settings["general"]["localization"]["categories"];

interface LocalizationProviderProps extends PropsWithChildren {
  readonly value: BrowserLocalizationRuntime;
}

const SOURCE_SELECTION = "source";

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

const createLocalizationRuntime = (
  settings: Settings,
  payload: BrowserLocalizationRuntimePayload
): BrowserLocalizationRuntime => {
  const configuredLanguageByCategory =
    resolveConfiguredLanguageByCategory(settings);

  return {
    activeEngineId: payload?.activeEngineId ?? null,
    availableEngines: payload?.availableEngines ?? [],
    configuredLanguageByCategory,
    ready: payload !== null,
    t: (category, messageId, fallback, variables) => {
      const entries =
        payload?.resolvedBundlesByCategory[category]?.entries ?? {};
      const resolvedMessage = entries[messageId] ?? fallback;
      return formatTemplate(resolvedMessage, variables);
    },
  };
};

const DEFAULT_LOCALIZATION_RUNTIME: BrowserLocalizationRuntime = {
  activeEngineId: null,
  availableEngines: [],
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

const LocalizationContext = createContext<BrowserLocalizationRuntime>(
  DEFAULT_LOCALIZATION_RUNTIME
);

export const useResolvedLocalization = (
  settings: Settings,
  payload: BrowserLocalizationRuntimePayload = null
): BrowserLocalizationRuntime =>
  useMemo(
    () => createLocalizationRuntime(settings, payload),
    [payload, settings]
  );

export const LocalizationProvider = ({
  children,
  value,
}: LocalizationProviderProps) =>
  createElement(LocalizationContext.Provider, { value }, children);

export const useLocalization = (): BrowserLocalizationRuntime =>
  useContext(LocalizationContext);
