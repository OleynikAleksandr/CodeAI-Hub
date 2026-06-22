interface GlmNativeToolDefinition {
  readonly function: {
    readonly description: string;
    readonly name: string;
    readonly parameters: Record<string, unknown>;
  };
  readonly type: "function";
}

const EMPTY_PARAMETERS_SCHEMA = {
  additionalProperties: false,
  properties: {},
  type: "object",
} as const;

export const GLM_NATIVE_EXPANDED_WORKFLOW_TOOLS: readonly GlmNativeToolDefinition[] =
  [
    buildGlmFunctionTool({
      description:
        "Read a UTF-8 text file with stable per-line anchors for precise follow-up edits. Use before edit_file_by_anchor.",
      name: "read_file_anchored",
      parameters: objectSchema(
        {
          limit: {
            description: "Optional maximum number of lines to return.",
            type: "number",
          },
          offset: {
            description: "Optional 1-based starting line.",
            type: "number",
          },
          path: {
            description: "Workspace-relative file path.",
            type: "string",
          },
        },
        ["path"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Replace exactly one old_string occurrence in a UTF-8 file. Use a large enough old_string context so it matches once.",
      name: "edit_file",
      parameters: objectSchema(
        {
          new_string: {
            description: "Replacement text.",
            type: "string",
          },
          old_string: {
            description: "Exact text to replace. Must match exactly once.",
            type: "string",
          },
          path: {
            description: "Workspace-relative file path.",
            type: "string",
          },
        },
        ["path", "old_string", "new_string"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Edit a UTF-8 file by string anchors returned from read_file_anchored. Supports old_range replacement/deletion and insert_before/insert_after.",
      name: "edit_file_by_anchor",
      parameters: objectSchema(
        {
          edits: {
            description:
              "Array of edits. Each edit uses string anchors: {old_range:[start_anchor,end_anchor], new_lines:[...]} or {insert_after:anchor,new_lines:[...]} or {insert_before:anchor,new_lines:[...]}. Do not pass line numbers.",
            items: {
              additionalProperties: false,
              properties: {
                insert_after: {
                  description: "String anchor returned by read_file_anchored.",
                  type: "string",
                },
                insert_before: {
                  description: "String anchor returned by read_file_anchored.",
                  type: "string",
                },
                new_lines: {
                  description:
                    "Replacement or inserted lines. Each entry is one line without a newline character.",
                  items: { type: "string" },
                  type: "array",
                },
                old_range: {
                  description:
                    "Inclusive [start_anchor,end_anchor] string anchors returned by read_file_anchored.",
                  items: { type: "string" },
                  maxItems: 2,
                  minItems: 2,
                  type: "array",
                },
              },
              required: ["new_lines"],
              type: "object",
            },
            type: "array",
          },
          path: {
            description: "Workspace-relative file path.",
            type: "string",
          },
        },
        ["path", "edits"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Fetch a URL through an installed headless Chrome/Chromium/Edge browser and return rendered DOM text.",
      name: "browser_fetch",
      parameters: objectSchema(
        {
          max_chars: {
            description: "Maximum response characters to return.",
            type: "number",
          },
          timeout_ms: {
            description: "Browser timeout in milliseconds.",
            type: "number",
          },
          url: {
            description: "HTTP, HTTPS, or file URL to render.",
            type: "string",
          },
        },
        ["url"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Best-effort workspace symbol search for TypeScript/JavaScript declarations. Lexical rg-backed MVP, not full tsserver LSP.",
      name: "workspace_symbols",
      parameters: objectSchema(
        {
          max_results: {
            description: "Maximum matching declarations to return.",
            type: "number",
          },
          query: {
            description: "Symbol query substring.",
            type: "string",
          },
        },
        ["query"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Best-effort go-to-definition for a TypeScript/JavaScript symbol. Lexical rg-backed MVP, not full tsserver LSP.",
      name: "go_to_definition",
      parameters: objectSchema(
        {
          max_results: {
            description: "Maximum matching definitions to return.",
            type: "number",
          },
          path: {
            description: "Optional workspace-relative file or directory.",
            type: "string",
          },
          symbol: {
            description: "Symbol name.",
            type: "string",
          },
        },
        ["symbol"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Best-effort find-references for a symbol in TypeScript/JavaScript files. Lexical rg-backed MVP, not full tsserver LSP.",
      name: "find_references",
      parameters: objectSchema(
        {
          max_results: {
            description: "Maximum matching references to return.",
            type: "number",
          },
          path: {
            description: "Optional workspace-relative file or directory.",
            type: "string",
          },
          symbol: {
            description: "Symbol name.",
            type: "string",
          },
        },
        ["symbol"]
      ),
    }),
    buildGlmFunctionTool({
      description: "Return structured git status for the workspace.",
      name: "git_status",
      parameters: EMPTY_PARAMETERS_SCHEMA,
    }),
    buildGlmFunctionTool({
      description: "Return a structured git diff for the workspace.",
      name: "git_diff",
      parameters: objectSchema({
        max_output_tokens: {
          description: "Approximate output budget.",
          type: "number",
        },
        path: {
          description: "Optional workspace-relative path.",
          type: "string",
        },
        staged: {
          description: "When true, return staged diff.",
          type: "boolean",
        },
      }),
    }),
    buildGlmFunctionTool({
      description: "Return recent git log entries for the workspace or path.",
      name: "git_log",
      parameters: objectSchema({
        max_count: {
          description: "Maximum commits to return.",
          type: "number",
        },
        path: {
          description: "Optional workspace-relative path.",
          type: "string",
        },
      }),
    }),
    buildGlmFunctionTool({
      description: "Return git blame lines for a workspace file range.",
      name: "git_blame",
      parameters: objectSchema(
        {
          end: {
            description: "1-based end line.",
            type: "number",
          },
          path: {
            description: "Workspace-relative file path.",
            type: "string",
          },
          start: {
            description: "1-based start line.",
            type: "number",
          },
        },
        ["path"]
      ),
    }),
    buildGlmFunctionTool({
      description:
        "Run a test/check command and return structured failure lines plus raw stdout/stderr.",
      name: "run_tests",
      parameters: objectSchema(
        {
          cmd: {
            description: "Test command to run.",
            type: "string",
          },
          max_output_tokens: {
            description: "Approximate output budget.",
            type: "number",
          },
          timeout_ms: {
            description: "Command timeout in milliseconds.",
            type: "number",
          },
          workdir: {
            description:
              "Optional workspace-relative working directory. Defaults to workspace root.",
            type: "string",
          },
        },
        ["cmd"]
      ),
    }),
  ];

function buildGlmFunctionTool(options: {
  readonly description: string;
  readonly name: string;
  readonly parameters: Record<string, unknown>;
}): GlmNativeToolDefinition {
  return {
    function: {
      description: options.description,
      name: options.name,
      parameters: options.parameters,
    },
    type: "function",
  };
}

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[] = []
): Record<string, unknown> {
  return {
    ...EMPTY_PARAMETERS_SCHEMA,
    properties,
    ...(required.length > 0 ? { required: [...required] } : {}),
  };
}
