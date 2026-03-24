export const ENTITY_ORIGINS = ["agent", "user", "merged"] as const;
export const ENTITY_STATUSES = ["proposed", "accepted", "deprecated"] as const;
export const MODULE_KINDS = [
  "service",
  "library",
  "adapter",
  "gateway",
  "store",
  "external",
] as const;
export const RELATION_TYPES = [
  "sync-call",
  "async-event",
  "shared-data",
  "config-ref",
] as const;
export const CRITICALITY_LEVELS = ["high", "medium", "low"] as const;
export type EntityOrigin = (typeof ENTITY_ORIGINS)[number];
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
export type ModuleKind = (typeof MODULE_KINDS)[number];
export type RelationType = (typeof RELATION_TYPES)[number];
export type Criticality = (typeof CRITICALITY_LEVELS)[number];

export type ProductPartEntity = {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly clusterIds: readonly string[];
  readonly standaloneModuleIds: readonly string[];
  readonly notes?: string;
};

export type ClusterEntity = {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
  readonly productPart: string;
  readonly moduleIds: readonly string[];
  readonly notes?: string;
};

export type ModuleEntity = {
  readonly id: string;
  readonly kind: ModuleKind;
  readonly title: string;
  readonly responsibility: string;
  readonly productPart?: string;
  readonly cluster?: string;
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly specTarget?: string;
  readonly contractTargets: readonly string[];
  readonly codeTargets: readonly string[];
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
  readonly rationale?: string;
};

export type ModuleRelation = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly criticality?: Criticality;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
};

export type ModuleMapModel = {
  readonly version: number;
  readonly stage: "diagram_modules";
  readonly revision: string;
  readonly updated: string;
  readonly productParts?: readonly ProductPartEntity[];
  readonly clusters?: readonly ClusterEntity[];
  readonly modules: readonly ModuleEntity[];
  readonly relations: readonly ModuleRelation[];
};

export type DiagramMapModel = ModuleMapModel;

export type MarkdownDslParseWarningCode =
  | "malformed-line"
  | "unknown-entity-header"
  | "unknown-section";

export type MarkdownDslParseWarning = {
  readonly code: MarkdownDslParseWarningCode;
  readonly line: number;
  readonly message: string;
};

export type MarkdownDslParseErrorCode =
  | "duplicate-entity-id"
  | "empty-file"
  | "invalid-entity-id"
  | "invalid-metadata"
  | "invalid-title"
  | "missing-required-field"
  | "missing-section";

export type MarkdownDslParseError = {
  readonly code: MarkdownDslParseErrorCode;
  readonly line: number;
  readonly message: string;
};

export type MarkdownDslParseSuccess = {
  readonly ok: true;
  readonly value: DiagramMapModel;
  readonly warnings: readonly MarkdownDslParseWarning[];
};

export type MarkdownDslParseFailure = {
  readonly ok: false;
  readonly error: MarkdownDslParseError;
  readonly warnings: readonly MarkdownDslParseWarning[];
};

export type MarkdownDslParseResult =
  | MarkdownDslParseSuccess
  | MarkdownDslParseFailure;
