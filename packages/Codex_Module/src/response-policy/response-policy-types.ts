export type CodexResponseMode = "strict" | "hybrid" | "debug_raw";

export type CodexStrictOutputPolicy = {
  readonly schemaText: string;
  readonly instructionText: string;
  readonly schemaObject: Record<string, unknown>;
};

export type CodexResponsePolicy = {
  readonly mode: CodexResponseMode;
  readonly strictOutput: CodexStrictOutputPolicy;
};
