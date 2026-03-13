export type GeneralResponseMode = "strict" | "hybrid" | "debug_raw";

export const RESPONSE_MODE_OPTIONS: ReadonlyArray<{
  readonly id: GeneralResponseMode;
  readonly label: string;
  readonly description: string;
}> = [
  {
    id: "strict",
    label: "Strict",
    description:
      "Force a JSON-shaped final answer using the editable strict schema.",
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description:
      "Allow free commentary during the turn and keep structure only for terminal output.",
  },
  {
    id: "debug_raw",
    label: "Debug/Raw",
    description:
      "Diagnostic mode for new models: avoid hard schema pressure on live turns.",
  },
];
