export type FlowNodeContinuityTemplateId =
  | "flow/continuity/create-report-doc.md"
  | "flow/continuity/create-report-code.md"
  | "flow/continuity/resume.md";

export type FlowNodeContinuityTemplateVariables = Readonly<
  Record<string, string>
>;

export type FlowNodeContinuityRolloverFilter = Readonly<{
  stageId: string;
  runSlug: string | null;
}>;

export const FLOW_NODE_CONTINUITY_TRUNK_STAGE_IDS = [
  "description",
  "virtual_simulation",
  "diagram_modules",
] as const;
