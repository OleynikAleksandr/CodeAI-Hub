const HOOK_REQUIRED_KEYS = [
  "requiredBeforeCommit",
  "requiredBeforePush",
] as const;
const SIZE_LIMIT_RE = /\b(?:500|five\s+hundred)\b/iu;
const SIZE_SCOPE_RE =
  /\b(?:class|classes|file|files|line|lines|microclass|source)\b/iu;

const MISSING_REQUIRED_SIZE_POLICY_GATE = "missing_required_size_policy_gate";
const SOURCE_SIZE_LIMIT_POLICY_TYPE = "source_size_limit";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): readonly string[] =>
  Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === "string")
    : [];

const collectSearchableText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(collectSearchableText).join(" ");
  }
  if (isRecord(value)) {
    return Object.values(value).map(collectSearchableText).join(" ");
  }
  return "";
};

const hasExpectedAppliesTo = (policy: Record<string, unknown>): boolean => {
  if (!Array.isArray(policy.appliesTo)) {
    return false;
  }
  const appliesTo = new Set(
    policy.appliesTo.filter((item): item is string => typeof item === "string")
  );
  return appliesTo.has("source_files") && appliesTo.has("classes");
};

const isStructuredSizePolicyGate = (gate: unknown): boolean => {
  if (!(isRecord(gate) && isRecord(gate.policy))) {
    return false;
  }
  return (
    gate.policy.type === SOURCE_SIZE_LIMIT_POLICY_TYPE &&
    gate.policy.maxLines === 500 &&
    hasExpectedAppliesTo(gate.policy)
  );
};

const isSizePolicyGate = (gateId: string, gate: unknown): boolean => {
  if (isStructuredSizePolicyGate(gate)) {
    return true;
  }
  const searchableText = `${gateId} ${collectSearchableText(gate)}`;
  return (
    SIZE_LIMIT_RE.test(searchableText) && SIZE_SCOPE_RE.test(searchableText)
  );
};

export const collectRequiredSizePolicyDiagnostics = (
  contract: Record<string, unknown>,
  commands: Record<string, unknown>
): readonly string[] => {
  const requiredHookGateIds = HOOK_REQUIRED_KEYS.flatMap((key) =>
    readStringArray(contract, key)
  );
  const hasRequiredSizePolicyGate = requiredHookGateIds.some((gateId) =>
    isSizePolicyGate(gateId, commands[gateId])
  );
  return hasRequiredSizePolicyGate ? [] : [MISSING_REQUIRED_SIZE_POLICY_GATE];
};
