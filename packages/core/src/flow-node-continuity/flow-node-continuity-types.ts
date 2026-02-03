export type FlowNodeContinuityTemplateId =
  | "flow/continuity/create-report-doc.md"
  | "flow/continuity/create-report-code.md"
  | "flow/continuity/resume.md";

export type FlowNodeContinuityTemplateVariables = Readonly<
  Record<string, string>
>;
