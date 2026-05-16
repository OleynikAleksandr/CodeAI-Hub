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

const validateStack = (mapJson: Record<string, unknown>): readonly string[] => {
  const stack = mapJson.stack;
  if (!isRecord(stack)) {
    return ["missing_foundation_field: stack"];
  }
  const errors: string[] = [];
  for (const key of ["languages", "frameworks", "runtimes"]) {
    if (!hasNonEmptyStringArray(stack, key)) {
      errors.push(`missing_foundation_field: stack.${key}`);
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
  if (!hasNonEmptyString(mapJson, "repoShape")) {
    errors.push("missing_foundation_field: repoShape");
  }
  errors.push(...validateStack(mapJson));
  errors.push(...validateProjectFoundation(mapJson));
  errors.push(...validateOpenQuestions(mapJson));
  return errors;
};
