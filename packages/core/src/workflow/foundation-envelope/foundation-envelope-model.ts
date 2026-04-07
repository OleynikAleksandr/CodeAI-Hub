export const FOUNDATION_ENVELOPE_DECISION_STATUSES = [
  "fixed",
  "proposed",
  "open",
] as const;

export type FoundationEnvelopeDecisionStatus =
  (typeof FOUNDATION_ENVELOPE_DECISION_STATUSES)[number];

export interface FoundationEnvelopeApplicationRoot {
  readonly id: "application-root";
  readonly shape: string | null;
  readonly summary: string;
  readonly title: string;
}

export interface FoundationEnvelopeProductPart {
  readonly decisionStatus: FoundationEnvelopeDecisionStatus | null;
  readonly id: string;
  readonly purpose: string;
  readonly runtimePlatform: string | null;
  readonly technology: string | null;
  readonly title: string;
}

export interface FoundationEnvelopeSharedZone {
  readonly id: string;
  readonly primaryOwner: string | null;
  readonly purpose: string;
  readonly sharedWith: readonly string[];
  readonly title: string;
}

export interface FoundationEnvelopeIntegrationSeam {
  readonly decisionStatus: FoundationEnvelopeDecisionStatus | null;
  readonly from: string;
  readonly id: string;
  readonly kind: string | null;
  readonly title: string;
  readonly to: string;
  readonly whyItMatters: string;
}

export interface FoundationEnvelopeDependencyRules {
  readonly allowed: readonly string[];
  readonly forbidden: readonly string[];
}

export interface FoundationEnvelopeModel {
  readonly applicationRoot: FoundationEnvelopeApplicationRoot;
  readonly dependencyRules: FoundationEnvelopeDependencyRules;
  readonly integrationSeams: readonly FoundationEnvelopeIntegrationSeam[];
  readonly openDecisions: readonly string[];
  readonly placementRules: readonly string[];
  readonly productParts: readonly FoundationEnvelopeProductPart[];
  readonly revision: string;
  readonly sharedZones: readonly FoundationEnvelopeSharedZone[];
  readonly stage: "foundation_envelope";
  readonly title: string;
  readonly updated: string | null;
  readonly version: 1;
}

export type FoundationEnvelopeParseErrorCode = "empty-file" | "missing-section";

export interface FoundationEnvelopeParseError {
  readonly code: FoundationEnvelopeParseErrorCode;
  readonly line: number;
  readonly message: string;
}

export interface FoundationEnvelopeParseSuccess {
  readonly ok: true;
  readonly value: FoundationEnvelopeModel;
  readonly warnings: readonly string[];
}

export interface FoundationEnvelopeParseFailure {
  readonly error: FoundationEnvelopeParseError;
  readonly ok: false;
  readonly warnings: readonly string[];
}

export type FoundationEnvelopeParseResult =
  | FoundationEnvelopeParseSuccess
  | FoundationEnvelopeParseFailure;
