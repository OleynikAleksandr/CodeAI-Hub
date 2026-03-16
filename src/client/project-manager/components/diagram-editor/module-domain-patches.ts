import type {
  EntityStatus,
  ModuleEntity,
  ModuleKind,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type ModuleDraft = {
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
  readonly notes?: string;
  readonly rationale?: string;
  readonly status?: EntityStatus;
};

export type ModuleUpdateFields = Partial<
  Omit<ModuleEntity, "id" | "origin"> & {
    readonly origin?: ModuleEntity["origin"];
  }
>;

export type AddModulePatch = {
  readonly type: "add-module";
  readonly module: ModuleDraft;
};

export type UpdateModulePatch = {
  readonly type: "update-module";
  readonly moduleId: string;
  readonly changes: ModuleUpdateFields;
};

export type DeleteModulePatch = {
  readonly type: "delete-module";
  readonly moduleId: string;
};

export type ModuleDomainPatch =
  | AddModulePatch
  | UpdateModulePatch
  | DeleteModulePatch;
