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

export interface ProductPartEntity {
  readonly clusterIds: readonly string[];
  readonly id: string;
  readonly notes?: string;
  readonly purpose: string;
  readonly standaloneModuleIds: readonly string[];
  readonly title: string;
}

export interface ClusterEntity {
  readonly id: string;
  readonly moduleIds: readonly string[];
  readonly notes?: string;
  readonly productPart: string;
  readonly purpose: string;
  readonly title: string;
}

export interface ModuleEntity {
  readonly cluster?: string;
  readonly codeTargets: readonly string[];
  readonly contractTargets: readonly string[];
  readonly id: string;
  readonly inputs: readonly string[];
  readonly kind: ModuleKind;
  readonly notes?: string;
  readonly origin: EntityOrigin;
  readonly outputs: readonly string[];
  readonly productPart?: string;
  readonly rationale?: string;
  readonly responsibility: string;
  readonly specTarget?: string;
  readonly status: EntityStatus;
  readonly title: string;
}

export interface ModuleRelation {
  readonly criticality?: Criticality;
  readonly from: string;
  readonly id: string;
  readonly label?: string;
  readonly notes?: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly to: string;
  readonly type: RelationType;
}

export interface ModuleMapModel {
  readonly clusters?: readonly ClusterEntity[];
  readonly modules: readonly ModuleEntity[];
  readonly productParts?: readonly ProductPartEntity[];
  readonly relations: readonly ModuleRelation[];
  readonly revision: string;
  readonly stage: "diagram_modules";
  readonly updated: string;
  readonly version: number;
}

export type DiagramMapModel = ModuleMapModel;

export type MarkdownDslParseWarningCode =
  | "malformed-line"
  | "unknown-entity-header"
  | "unknown-section";

export interface MarkdownDslParseWarning {
  readonly code: MarkdownDslParseWarningCode;
  readonly line: number;
  readonly message: string;
}

export type MarkdownDslParseErrorCode =
  | "duplicate-entity-id"
  | "empty-file"
  | "invalid-entity-id"
  | "invalid-metadata"
  | "invalid-title"
  | "missing-required-field"
  | "missing-section";

export interface MarkdownDslParseError {
  readonly code: MarkdownDslParseErrorCode;
  readonly line: number;
  readonly message: string;
}

export interface MarkdownDslParseSuccess {
  readonly ok: true;
  readonly value: DiagramMapModel;
  readonly warnings: readonly MarkdownDslParseWarning[];
}

export interface MarkdownDslParseFailure {
  readonly error: MarkdownDslParseError;
  readonly ok: false;
  readonly warnings: readonly MarkdownDslParseWarning[];
}

export type MarkdownDslParseResult =
  | MarkdownDslParseSuccess
  | MarkdownDslParseFailure;
