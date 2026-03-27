export type CodexResponseMode = "strict" | "hybrid" | "debug_raw";

export interface CodexStrictOutputPolicy {
  readonly instructionText: string;
  readonly schemaObject: Record<string, unknown>;
  readonly schemaText: string;
}

export interface CodexResponsePolicy {
  readonly mode: CodexResponseMode;
  readonly strictOutput: CodexStrictOutputPolicy;
}
