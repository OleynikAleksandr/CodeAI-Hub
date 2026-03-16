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
export const FACADE_VISIBILITIES = ["public", "internal"] as const;
export const FACADE_PORT_DIRECTIONS = ["In", "Out"] as const;

export type EntityOrigin = (typeof ENTITY_ORIGINS)[number];
export type EntityStatus = (typeof ENTITY_STATUSES)[number];
export type ModuleKind = (typeof MODULE_KINDS)[number];
export type RelationType = (typeof RELATION_TYPES)[number];
export type Criticality = (typeof CRITICALITY_LEVELS)[number];
export type FacadeVisibility = (typeof FACADE_VISIBILITIES)[number];
export type FacadePortDirection = (typeof FACADE_PORT_DIRECTIONS)[number];

export type ModuleEntity = {
  readonly id: string;
  readonly kind: ModuleKind;
  readonly title: string;
  readonly responsibility: string;
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
  readonly modules: readonly ModuleEntity[];
  readonly relations: readonly ModuleRelation[];
};

export type FacadePort = {
  readonly direction: FacadePortDirection;
  readonly type: string;
  readonly target: string;
};

export type FacadeEntity = {
  readonly id: string;
  readonly module: string;
  readonly kind: "class";
  readonly visibility: FacadeVisibility;
  readonly methods: readonly string[];
  readonly ports: readonly FacadePort[];
  readonly contractTargets: readonly string[];
  readonly codeTargets: readonly string[];
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
  readonly rationale?: string;
};

export type FacadeRelation = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly origin: EntityOrigin;
  readonly status: EntityStatus;
  readonly notes?: string;
};

export type FacadeMapModel = {
  readonly version: number;
  readonly stage: "diagram_facades";
  readonly revision: string;
  readonly updated: string;
  readonly facades: readonly FacadeEntity[];
  readonly relations: readonly FacadeRelation[];
};

export type DiagramMapModel = ModuleMapModel | FacadeMapModel;

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
