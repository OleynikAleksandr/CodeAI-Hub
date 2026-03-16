import type {
  EntityStatus,
  RelationType,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type FacadeRelationDraft = {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly type: RelationType;
  readonly label?: string;
  readonly notes?: string;
  readonly status?: EntityStatus;
};

export type FacadeRelationUpdateFields = Partial<
  Omit<FacadeRelationDraft, "id" | "from" | "to"> & {
    readonly from?: string;
    readonly to?: string;
    readonly origin?: "agent" | "user" | "merged";
  }
>;

export type AddFacadeRelationPatch = {
  readonly type: "add-facade-relation";
  readonly relation: FacadeRelationDraft;
};

export type UpdateFacadeRelationPatch = {
  readonly type: "update-facade-relation";
  readonly relationId: string;
  readonly changes: FacadeRelationUpdateFields;
};

export type DeleteFacadeRelationPatch = {
  readonly type: "delete-facade-relation";
  readonly relationId: string;
};

export type FacadeRelationPatch =
  | AddFacadeRelationPatch
  | UpdateFacadeRelationPatch
  | DeleteFacadeRelationPatch;
