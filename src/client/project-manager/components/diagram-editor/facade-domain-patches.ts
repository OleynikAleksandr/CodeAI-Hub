import type {
  EntityStatus,
  FacadeEntity,
  FacadePort,
  FacadeVisibility,
} from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export type FacadeDraft = {
  readonly id: string;
  readonly module: string;
  readonly kind: "class";
  readonly visibility: FacadeVisibility;
  readonly methods: readonly string[];
  readonly ports: readonly FacadePort[];
  readonly contractTargets: readonly string[];
  readonly codeTargets: readonly string[];
  readonly notes?: string;
  readonly rationale?: string;
  readonly status?: EntityStatus;
};

export type FacadeUpdateFields = Partial<
  Omit<FacadeEntity, "id" | "origin"> & {
    readonly origin?: FacadeEntity["origin"];
  }
>;

export type AddFacadePatch = {
  readonly type: "add-facade";
  readonly facade: FacadeDraft;
};

export type UpdateFacadePatch = {
  readonly type: "update-facade";
  readonly facadeId: string;
  readonly changes: FacadeUpdateFields;
};

export type DeleteFacadePatch = {
  readonly type: "delete-facade";
  readonly facadeId: string;
};

export type FacadeDomainPatch =
  | AddFacadePatch
  | UpdateFacadePatch
  | DeleteFacadePatch;
