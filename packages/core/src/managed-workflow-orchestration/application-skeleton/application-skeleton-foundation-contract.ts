export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasNonEmptyString = (
  value: Record<string, unknown>,
  key: string
): boolean => typeof value[key] === "string" && value[key].trim().length > 0;

const hasStringArray = (value: Record<string, unknown>, key: string): boolean =>
  Array.isArray(value[key]) &&
  value[key].every((entry) => typeof entry === "string");

const hasNonEmptyStringArray = (
  value: Record<string, unknown>,
  key: string
): boolean =>
  Array.isArray(value[key]) &&
  value[key].some(
    (entry) => typeof entry === "string" && entry.trim().length > 0
  );

const STACK_PLACEHOLDER_RE =
  /pending|placeholder|tbd|todo|unknown|unresolved|not selected|not chosen|ожида|не\s+выбран|не\s+выбрано|не\s+определ|не\s+зафикс|уточн/iu;
const FRAMEWORK_DECISION_QUESTION_RE =
  /framework|frontend|front-end|ui|desktop|shell|launcher|webview|electron|cef|react|vue|svelte|angular|next|vite|фреймворк|фронтенд|интерфейс|оболоч|лаунчер|десктоп|вебвью/iu;

const collectQuestionText = (entry: unknown): string => {
  if (typeof entry === "string") {
    return entry;
  }
  if (!isRecord(entry)) {
    return "";
  }
  return Object.values(entry)
    .filter((value): value is string => typeof value === "string")
    .join(" ");
};

const hasFrameworkDecisionQuestion = (
  mapJson: Record<string, unknown>
): boolean =>
  Array.isArray(mapJson.openQuestions) &&
  mapJson.openQuestions.some((entry) =>
    FRAMEWORK_DECISION_QUESTION_RE.test(collectQuestionText(entry))
  );

const findPlaceholderStackEntries = (
  stack: Record<string, unknown>,
  key: string
): readonly string[] =>
  Array.isArray(stack[key])
    ? stack[key].filter(
        (entry): entry is string =>
          typeof entry === "string" && STACK_PLACEHOLDER_RE.test(entry)
      )
    : [];

const validateStack = (mapJson: Record<string, unknown>): readonly string[] => {
  const stack = mapJson.stack;
  if (!isRecord(stack)) {
    return ["missing_foundation_field: stack"];
  }
  const errors: string[] = [];
  const frameworkQuestionExists = hasFrameworkDecisionQuestion(mapJson);
  for (const key of ["languages", "runtimes"]) {
    if (!hasNonEmptyStringArray(stack, key)) {
      errors.push(`missing_foundation_field: stack.${key}`);
    }
  }
  if (
    !(frameworkQuestionExists || hasNonEmptyStringArray(stack, "frameworks"))
  ) {
    errors.push("missing_foundation_field: stack.frameworks");
  }
  for (const key of ["languages", "frameworks", "runtimes"]) {
    for (const entry of findPlaceholderStackEntries(stack, key)) {
      errors.push(`placeholder_foundation_field: stack.${key}: ${entry}`);
    }
  }
  return errors;
};

const validateOpenQuestions = (
  mapJson: Record<string, unknown>
): readonly string[] => {
  if (!Array.isArray(mapJson.openQuestions)) {
    return ["missing_foundation_field: openQuestions"];
  }
  const invalidEntry = mapJson.openQuestions.some((entry) => {
    if (typeof entry === "string") {
      return entry.trim().length === 0;
    }
    if (isRecord(entry)) {
      const question = entry.question;
      const id = entry.id;
      return !(
        (typeof question === "string" && question.trim().length > 0) ||
        (typeof id === "string" && id.trim().length > 0)
      );
    }
    return true;
  });
  if (invalidEntry) {
    return ["invalid_foundation_field: openQuestions"];
  }
  return [];
};

const validateProjectFoundation = (
  mapJson: Record<string, unknown>
): readonly string[] => {
  const foundation = mapJson.projectFoundation;
  if (!isRecord(foundation)) {
    return ["missing_foundation_field: projectFoundation"];
  }
  const errors: string[] = [];
  if (!hasNonEmptyString(foundation, "installCommand")) {
    errors.push("missing_foundation_field: projectFoundation.installCommand");
  }
  for (const key of ["requiredScripts", "configFiles"]) {
    if (!hasStringArray(foundation, key)) {
      errors.push(`missing_foundation_field: projectFoundation.${key}`);
    }
  }
  if (!hasStringArray(foundation, "firstWaveEntrypoints")) {
    errors.push(
      "missing_foundation_field: projectFoundation.firstWaveEntrypoints"
    );
  }
  return errors;
};

export const validateApplicationSkeletonFoundationDraft = (
  mapJson: Record<string, unknown> | null
): readonly string[] => {
  if (!mapJson) {
    return [];
  }
  const errors: string[] = [];
  if (!hasNonEmptyString(mapJson, "packageManager")) {
    errors.push("missing_foundation_field: packageManager");
  }
  errors.push(...validateStack(mapJson));
  errors.push(...validateProjectFoundation(mapJson));
  errors.push(...validateOpenQuestions(mapJson));
  return errors;
};
