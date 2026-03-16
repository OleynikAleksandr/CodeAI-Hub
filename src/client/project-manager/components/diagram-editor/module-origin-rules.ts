import type { EntityOrigin } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";

export const resolveLocalEditOrigin = (origin: EntityOrigin): EntityOrigin =>
  origin === "agent" ? "merged" : origin;
