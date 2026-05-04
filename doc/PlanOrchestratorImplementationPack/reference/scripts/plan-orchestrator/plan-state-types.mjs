export const PLAN_STATE_SCHEMA = "codeai-plan-v1";

export const PLAN_STATE_BLOCK_START = "<!-- codeai-plan-state:start -->";
export const PLAN_STATE_BLOCK_END = "<!-- codeai-plan-state:end -->";

export const EXECUTION_SCOPE_STATUSES = Object.freeze([
  "NONE",
  "ACTIVE",
  "BLOCKED",
  "ACCEPTED_PENDING_CLOSEOUT",
]);

export const PLAN_STATE_STRING_FIELDS = Object.freeze([
  "schema",
  "executionScopeStatus",
  "planId",
  "branch",
  "baseHead",
  "lastRecordedCommit",
  "planningSource",
]);

export class PlanStateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PlanStateError";
    this.code = code;
    this.details = details;
  }
}
