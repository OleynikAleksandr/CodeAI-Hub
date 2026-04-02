export interface LocalizationLanguageOption {
  readonly code: string;
  readonly label: string;
}

const normalizeSearchValue = (value: string): string =>
  value.trim().toLowerCase();

export const filterLocalizationLanguageOptions = (
  options: readonly LocalizationLanguageOption[],
  query: string
): readonly LocalizationLanguageOption[] => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const normalizedCode = normalizeSearchValue(option.code);
    const normalizedLabel = normalizeSearchValue(option.label);
    return (
      normalizedCode.includes(normalizedQuery) ||
      normalizedLabel.includes(normalizedQuery)
    );
  });
};
