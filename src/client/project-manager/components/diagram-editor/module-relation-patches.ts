import type {
  Criticality,
  EntityStatus,
  RelationType,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type ModuleRelationDraft = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly criticality?: Criticality;
  readonly notes?: string;
  readonly status?: EntityStatus;
};

export type ModuleRelationUpdateFields = Partial<
  Omit<ModuleRelationDraft, "id" | "from" | "to"> & {
    readonly from?: string;
    readonly to?: string;
    readonly origin?: "agent" | "user" | "merged";
  }
>;

export type AddModuleRelationPatch = {
  readonly type: "add-relation";
  readonly relation: ModuleRelationDraft;
};

export type UpdateModuleRelationPatch = {
  readonly type: "update-relation";
  readonly relationId: string;
  readonly changes: ModuleRelationUpdateFields;
};

export type DeleteModuleRelationPatch = {
  readonly type: "delete-relation";
  readonly relationId: string;
};

export type ModuleRelationPatch =
  | AddModuleRelationPatch
  | UpdateModuleRelationPatch
  | DeleteModuleRelationPatch;
