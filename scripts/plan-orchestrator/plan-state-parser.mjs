import {
  EXECUTION_SCOPE_STATUSES,
  PLAN_STATE_BLOCK_END,
  PLAN_STATE_BLOCK_START,
  PLAN_STATE_SCHEMA,
  PLAN_STATE_STRING_FIELDS,
  PlanStateError,
} from "./plan-state-types.mjs";

const PLAN_STATE_BLOCK_PATTERN =
  /<!-- codeai-plan-state:start -->\s*```json\s*([\s\S]*?)\s*```\s*<!-- codeai-plan-state:end -->/gu;

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateNonEmptyString = (state, fieldName) => {
  if (typeof state[fieldName] !== "string" || state[fieldName].trim() === "") {
    throw new PlanStateError(
      "PLAN_STATE_INVALID_FIELD",
      `Plan state field "${fieldName}" must be a non-empty string.`,
      { fieldName }
    );
  }
};

const validateOptionalPointer = (state, fieldName) => {
  const value = state[fieldName];

  if (value === null || typeof value === "string") {
    return;
  }

  throw new PlanStateError(
    "PLAN_STATE_INVALID_FIELD",
    `Plan state field "${fieldName}" must be a string or null.`,
    { fieldName }
  );
};

export const validatePlanState = (state) => {
  if (!isRecord(state)) {
    throw new PlanStateError(
      "PLAN_STATE_NOT_OBJECT",
      "Plan state JSON must be an object."
    );
  }

  for (const fieldName of PLAN_STATE_STRING_FIELDS) {
    validateNonEmptyString(state, fieldName);
  }

  if (state.schema !== PLAN_STATE_SCHEMA) {
    throw new PlanStateError(
      "PLAN_STATE_UNSUPPORTED_SCHEMA",
      `Unsupported plan state schema "${state.schema}".`,
      { expected: PLAN_STATE_SCHEMA, actual: state.schema }
    );
  }

  if (!EXECUTION_SCOPE_STATUSES.includes(state.executionScopeStatus)) {
    throw new PlanStateError(
      "PLAN_STATE_INVALID_STATUS",
      `Unsupported execution scope status "${state.executionScopeStatus}".`,
      {
        allowed: EXECUTION_SCOPE_STATUSES,
        actual: state.executionScopeStatus,
      }
    );
  }

  validateOptionalPointer(state, "currentTaskId");
  validateOptionalPointer(state, "expectedCommitMessage");

  if (state.executionScopeStatus === "ACTIVE") {
    validateNonEmptyString(state, "currentTaskId");
  }

  if (!Object.hasOwn(state, "debt")) {
    throw new PlanStateError(
      "PLAN_STATE_INVALID_FIELD",
      'Plan state field "debt" must be present.',
      { fieldName: "debt" }
    );
  }

  if (state.debt !== null && !isRecord(state.debt)) {
    throw new PlanStateError(
      "PLAN_STATE_INVALID_FIELD",
      'Plan state field "debt" must be null or an object.',
      { fieldName: "debt" }
    );
  }

  return state;
};

export const parsePlanStateMarkdown = (
  markdown,
  sourcePath = "todo-plan.md"
) => {
  if (typeof markdown !== "string") {
    throw new TypeError("markdown must be a string");
  }

  const matches = Array.from(markdown.matchAll(PLAN_STATE_BLOCK_PATTERN));

  if (matches.length === 0) {
    throw new PlanStateError(
      "PLAN_STATE_BLOCK_MISSING",
      `Missing ${PLAN_STATE_BLOCK_START} / ${PLAN_STATE_BLOCK_END} block.`,
      { sourcePath }
    );
  }

  if (matches.length > 1) {
    throw new PlanStateError(
      "PLAN_STATE_BLOCK_DUPLICATE",
      "Expected exactly one plan state block.",
      { sourcePath, count: matches.length }
    );
  }

  const [match] = matches;
  const rawJson = match[1].trim();
  let state;

  try {
    state = JSON.parse(rawJson);
  } catch (error) {
    throw new PlanStateError(
      "PLAN_STATE_JSON_INVALID",
      `Plan state JSON is malformed: ${error.message}`,
      { sourcePath }
    );
  }

  return {
    state: validatePlanState(state),
    block: {
      end: match.index + match[0].length,
      rawJson,
      start: match.index,
    },
  };
};
