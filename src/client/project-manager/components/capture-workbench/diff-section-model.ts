export type CaptureWorkbenchDiffSectionId =
  | "system_prompt"
  | "tools"
  | "user_prompt"
  | "model_reasoning"
  | "output_schema"
  | "endpoint"
  | "sdk_isolation_claude"
  | "process_profile_codex"
  | "workflow_context";

export type CaptureWorkbenchDiffStatus =
  | "added"
  | "changed"
  | "equal"
  | "removed";

export interface CaptureWorkbenchDiffSectionDefinition {
  readonly id: CaptureWorkbenchDiffSectionId;
  readonly provider: "both" | "claude" | "codex";
  readonly title: string;
}

export interface CaptureWorkbenchDiffSide {
  readonly content: string | null;
  readonly lines: readonly string[];
}

export interface CaptureWorkbenchDiffSection {
  readonly collapsedByDefault: boolean;
  readonly definition: CaptureWorkbenchDiffSectionDefinition;
  readonly left: CaptureWorkbenchDiffSide;
  readonly right: CaptureWorkbenchDiffSide;
  readonly status: CaptureWorkbenchDiffStatus;
  readonly statusText: string;
}

export const CAPTURE_WORKBENCH_DIFF_SECTIONS: readonly CaptureWorkbenchDiffSectionDefinition[] =
  [
    {
      id: "system_prompt",
      provider: "both",
      title: "System Prompt",
    },
    {
      id: "tools",
      provider: "both",
      title: "Tools",
    },
    {
      id: "user_prompt",
      provider: "both",
      title: "User Prompt (workflow body)",
    },
    {
      id: "model_reasoning",
      provider: "both",
      title: "Model & Reasoning",
    },
    {
      id: "output_schema",
      provider: "both",
      title: "Output Schema",
    },
    {
      id: "endpoint",
      provider: "both",
      title: "Endpoint",
    },
    {
      id: "sdk_isolation_claude",
      provider: "claude",
      title: "SDK Isolation (Claude)",
    },
    {
      id: "process_profile_codex",
      provider: "codex",
      title: "Process Profile / Sandbox (Codex)",
    },
    {
      id: "workflow_context",
      provider: "both",
      title: "Project Doc Reference / Workflow context",
    },
  ] as const;

export const findCaptureWorkbenchDiffSectionDefinition = (
  id: CaptureWorkbenchDiffSectionId
): CaptureWorkbenchDiffSectionDefinition =>
  CAPTURE_WORKBENCH_DIFF_SECTIONS.find((section) => section.id === id) ??
  unreachableSection(id);

const unreachableSection = (
  id: CaptureWorkbenchDiffSectionId
): CaptureWorkbenchDiffSectionDefinition => {
  throw new Error(`Unknown Capture Workbench diff section: ${id}`);
};
