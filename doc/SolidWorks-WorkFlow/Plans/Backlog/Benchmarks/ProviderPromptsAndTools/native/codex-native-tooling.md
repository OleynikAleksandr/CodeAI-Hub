# Нативные инструменты Codex

Статус: нативный базовый снимок
Обновлено: 2026-06-22

- Источник захвата: `/Users/oleksandroliinyk/.codeai-hub/logs/native-request-capture/2026-06-22T11-14-12-396Z-codex-native-request.jsonl`
- Время захвата: `2026-06-22T11:14:12.396Z`
- Релиз: `1.2.581`
- Провайдер: `codex`
- Модель: `gpt-5.5`
- Режим: `vanilla`

## Назначение

Этот документ хранит нативную поверхность инструментов Codex, полученную через Provider Native Request Capture. Он нужен как источник сравнения перед тем, как создавать или менять поверхность инструментов GLM.

## Важное правило

Пояснения и сводка написаны на русском языке для обсуждения. Полный JSON ниже оставлен без перевода: это точное тело захваченного запроса с описаниями и схемами инструментов Codex.

## Сводка инструментов

| Инструмент | Тип | Длина описания | Верхнеуровневые ключи |
| --- | --- | ---: | --- |
| `exec_command` | `function` | 82 | `type, name, description, strict, parameters` |
| `write_stdin` | `function` | 80 | `type, name, description, strict, parameters` |
| `list_mcp_resources` | `function` | 238 | `type, name, description, strict, parameters` |
| `list_mcp_resource_templates` | `function` | 300 | `type, name, description, strict, parameters` |
| `read_mcp_resource` | `function` | 83 | `type, name, description, strict, parameters` |
| `update_plan` | `function` | 157 | `type, name, description, strict, parameters` |
| `request_user_input` | `function` | 350 | `type, name, description, strict, parameters` |
| `list_available_plugins_to_install` | `function` | 565 | `type, name, description, strict, parameters` |
| `request_plugin_install` | `function` | 428 | `type, name, description, strict, parameters` |
| `apply_patch` | `custom` | 100 | `type, name, description, format` |
| `view_image` | `function` | 124 | `type, name, description, strict, parameters` |
| `mcp__codex` | `namespace` | 34 | `type, name, description, tools` |
| `mcp__node_repl` | `namespace` | 1126 | `type, name, description, tools` |
| `mcp__playwright` | `namespace` | 39 | `type, name, description, tools` |
| `get_goal` | `function` | 122 | `type, name, description, strict, parameters` |
| `create_goal` | `function` | 265 | `type, name, description, strict, parameters` |
| `update_goal` | `function` | 1362 | `type, name, description, strict, parameters` |
| `tool_search` | `tool_search` | 475 | `type, execution, description, parameters` |
| `web_search` | `web_search` | 0 | `type, external_web_access, search_content_types` |
| `image_generation` | `image_generation` | 0 | `type, output_format` |

## Полные захваченные определения инструментов

```json
[
  {
    "type": "function",
    "name": "exec_command",
    "description": "Runs a command in a PTY, returning output or a session ID for ongoing interaction.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "cmd": {
          "type": "string",
          "description": "Shell command to execute."
        },
        "justification": {
          "type": "string",
          "description": "User-facing approval question for `require_escalated`; omit otherwise."
        },
        "login": {
          "type": "boolean",
          "description": "True runs the shell with -l/-i semantics; false disables them. Defaults to true."
        },
        "max_output_tokens": {
          "type": "number",
          "description": "Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy."
        },
        "prefix_rule": {
          "type": "array",
          "description": "Reusable approval prefix for `cmd`, only with `sandbox_permissions: \"require_escalated\"`; for example [\"git\", \"pull\"].",
          "items": {
            "type": "string"
          }
        },
        "sandbox_permissions": {
          "type": "string",
          "description": "Per-command sandbox override. Defaults to `use_default`; use `require_escalated` for unsandboxed execution.",
          "enum": [
            "use_default",
            "require_escalated"
          ]
        },
        "shell": {
          "type": "string",
          "description": "Shell binary to launch. Defaults to the user's default shell."
        },
        "tty": {
          "type": "boolean",
          "description": "True allocates a PTY for the command; false or omitted uses plain pipes."
        },
        "workdir": {
          "type": "string",
          "description": "Working directory for the command. Defaults to the turn cwd."
        },
        "yield_time_ms": {
          "type": "number",
          "description": "Wait before yielding output. Defaults to 10000 ms; effective range is 250-30000 ms."
        }
      },
      "required": [
        "cmd"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "write_stdin",
    "description": "Writes characters to an existing unified exec session and returns recent output.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "chars": {
          "type": "string",
          "description": "Bytes to write to stdin. Defaults to empty, which polls without writing."
        },
        "max_output_tokens": {
          "type": "number",
          "description": "Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy."
        },
        "session_id": {
          "type": "number",
          "description": "Identifier of the running unified exec session."
        },
        "yield_time_ms": {
          "type": "number",
          "description": "Wait before yielding output. Non-empty writes default to 250 ms and cap at 30000 ms; empty polls wait 5000-300000 ms by default."
        }
      },
      "required": [
        "session_id"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "list_mcp_resources",
    "description": "Lists resources provided by MCP servers. Resources allow servers to share data that provides context to language models, such as files, database schemas, or application-specific information. Prefer resources over web search when possible.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string",
          "description": "Opaque cursor from a previous list_mcp_resources call; omit for the first page."
        },
        "server": {
          "type": "string",
          "description": "MCP server name. Omit to list resources from every configured server."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "list_mcp_resource_templates",
    "description": "Lists resource templates provided by MCP servers. Parameterized resource templates allow servers to share data that takes parameters and provides context to language models, such as files, database schemas, or application-specific information. Prefer resource templates over web search when possible.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "cursor": {
          "type": "string",
          "description": "Opaque cursor from a previous list_mcp_resource_templates call; omit for the first page."
        },
        "server": {
          "type": "string",
          "description": "MCP server name. Omit to list resource templates from every configured server."
        }
      },
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "read_mcp_resource",
    "description": "Read a specific resource from an MCP server given the server name and resource URI.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "server": {
          "type": "string",
          "description": "MCP server name exactly as configured. Must match the 'server' field returned by list_mcp_resources."
        },
        "uri": {
          "type": "string",
          "description": "Resource URI to read. Must be one of the URIs returned by list_mcp_resources."
        }
      },
      "required": [
        "server",
        "uri"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "update_plan",
    "description": "Updates the task plan.\nProvide an optional explanation and a list of plan items, each with a step and status.\nAt most one step can be in_progress at a time.\n",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "explanation": {
          "type": "string",
          "description": "Optional explanation for this plan update."
        },
        "plan": {
          "type": "array",
          "description": "The list of steps",
          "items": {
            "type": "object",
            "properties": {
              "status": {
                "type": "string",
                "description": "Step status.",
                "enum": [
                  "pending",
                  "in_progress",
                  "completed"
                ]
              },
              "step": {
                "type": "string",
                "description": "Task step text."
              }
            },
            "required": [
              "step",
              "status"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "plan"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "request_user_input",
    "description": "Request user input for one to three short questions and wait for the response. Set autoResolutionMs, from 60000 to 240000 milliseconds, only when the question is useful but non-blocking and continuing with best judgment is acceptable if the user does not answer; omit it when explicit user input is required. This tool is only available in Plan mode.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "autoResolutionMs": {
          "type": "number",
          "description": "Optional auto-resolution window in milliseconds, from 60000 to 240000. Include this only when the question is useful but non-blocking and continuing with best judgment is acceptable if the user does not answer; omit it when explicit user input is required before continuing. Use 60000 for lightly helpful context and up to 240000 when the answer would materially unblock better work."
        },
        "questions": {
          "type": "array",
          "description": "Questions to show the user. Prefer 1 and do not exceed 3",
          "items": {
            "type": "object",
            "properties": {
              "header": {
                "type": "string",
                "description": "Short header label shown in the UI (12 or fewer chars)."
              },
              "id": {
                "type": "string",
                "description": "Stable identifier for mapping answers (snake_case)."
              },
              "options": {
                "type": "array",
                "description": "Provide 2-3 mutually exclusive choices. Put the recommended option first and suffix its label with \"(Recommended)\". Do not include an \"Other\" option in this list; the client will add a free-form \"Other\" option automatically.",
                "items": {
                  "type": "object",
                  "properties": {
                    "description": {
                      "type": "string",
                      "description": "One short sentence explaining impact/tradeoff if selected."
                    },
                    "label": {
                      "type": "string",
                      "description": "User-facing label (1-5 words)."
                    }
                  },
                  "required": [
                    "label",
                    "description"
                  ],
                  "additionalProperties": false
                }
              },
              "question": {
                "type": "string",
                "description": "Single-sentence prompt shown to the user."
              }
            },
            "required": [
              "id",
              "header",
              "question",
              "options"
            ],
            "additionalProperties": false
          }
        }
      },
      "required": [
        "questions"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "list_available_plugins_to_install",
    "description": "# List plugin/connector install candidates\n\nUse this tool only when both are true:\n- The user explicitly asks to use a specific plugin or connector that is not already available in the current context or active `tools` list.\n- `tool_search` is not available, or it has already been called and did not find or make the requested tool callable.\n\nReturns known plugins and connectors that can be passed to `request_plugin_install`. When both a plugin and a connector match, prefer the plugin; use the connector only when its corresponding plugin is already installed.\n",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "request_plugin_install",
    "description": "# Request plugin/connector install\n\nUse this tool only after `list_available_plugins_to_install` returns a plugin or connector that exactly matches the user's explicit request.\n\nDo not use it for adjacent capabilities, broad recommendations, or tools that merely seem useful. Pass the returned `tool_type` through directly, and pass the returned `id` as `tool_id`.\n\nIMPORTANT: DO NOT call this tool in parallel with other tools.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "action_type": {
          "type": "string",
          "description": "Suggested action for the tool. Use \"install\"."
        },
        "suggest_reason": {
          "type": "string",
          "description": "Concise one-line user-facing reason why this plugin or connector can help with the current request."
        },
        "tool_id": {
          "type": "string",
          "description": "Connector or plugin id to suggest."
        },
        "tool_type": {
          "type": "string",
          "description": "Type of discoverable tool to suggest. Use \"connector\" or \"plugin\"."
        }
      },
      "required": [
        "tool_type",
        "action_type",
        "tool_id",
        "suggest_reason"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "custom",
    "name": "apply_patch",
    "description": "Use the `apply_patch` tool to edit files. This is a FREEFORM tool, so do not wrap the patch in JSON.",
    "format": {
      "type": "grammar",
      "syntax": "lark",
      "definition": "start: begin_patch hunk+ end_patch\nbegin_patch: \"*** Begin Patch\" LF\nend_patch: \"*** End Patch\" LF?\n\nhunk: add_hunk | delete_hunk | update_hunk\nadd_hunk: \"*** Add File: \" filename LF add_line+\ndelete_hunk: \"*** Delete File: \" filename LF\nupdate_hunk: \"*** Update File: \" filename LF change_move? change?\n\nfilename: /(.+)/\nadd_line: \"+\" /(.*)/ LF -> line\n\nchange_move: \"*** Move to: \" filename LF\nchange: (change_context | change_line)+ eof_line?\nchange_context: (\"@@\" | \"@@ \" /(.+)/) LF\nchange_line: (\"+\" | \"-\" | \" \") /(.*)/ LF\neof_line: \"*** End of File\" LF\n\n%import common.LF\n"
    }
  },
  {
    "type": "function",
    "name": "view_image",
    "description": "View a local image file from the filesystem when visual inspection is needed. Use this for images already available on disk.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "detail": {
          "type": "string",
          "description": "Image detail level. Defaults to `high`; use `original` to preserve exact resolution.",
          "enum": [
            "high",
            "original"
          ]
        },
        "path": {
          "type": "string",
          "description": "Local filesystem path to an image file."
        }
      },
      "required": [
        "path"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "namespace",
    "name": "mcp__codex",
    "description": "Tools in the mcp__codex namespace.",
    "tools": [
      {
        "type": "function",
        "name": "codex",
        "description": "Run a Codex session. Accepts configuration parameters matching the Codex Config struct.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "approval-policy": {
              "type": "string",
              "description": "Approval policy for shell commands generated by the model: `untrusted`, `on-failure`, `on-request`, `never`.",
              "enum": [
                "untrusted",
                "on-failure",
                "on-request",
                "never"
              ]
            },
            "base-instructions": {
              "type": "string",
              "description": "The set of instructions to use instead of the default ones."
            },
            "compact-prompt": {
              "type": "string",
              "description": "Prompt used when compacting the conversation."
            },
            "config": {
              "type": "object",
              "description": "Individual config settings that will override what is in CODEX_HOME/config.toml.",
              "properties": {},
              "additionalProperties": true
            },
            "cwd": {
              "type": "string",
              "description": "Working directory for the session. If relative, it is resolved against the server process's current working directory."
            },
            "developer-instructions": {
              "type": "string",
              "description": "Developer instructions that should be injected as a developer role message."
            },
            "model": {
              "type": "string",
              "description": "Optional override for the model name (e.g. 'gpt-5.2', 'gpt-5.2-codex')."
            },
            "prompt": {
              "type": "string",
              "description": "The *initial user prompt* to start the Codex conversation."
            },
            "sandbox": {
              "type": "string",
              "description": "Sandbox mode: `read-only`, `workspace-write`, or `danger-full-access`.",
              "enum": [
                "read-only",
                "workspace-write",
                "danger-full-access"
              ]
            }
          },
          "required": [
            "prompt"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "codex_reply",
        "description": "Continue a Codex conversation by providing the thread id and prompt.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "conversationId": {
              "type": "string",
              "description": "DEPRECATED: use threadId instead."
            },
            "prompt": {
              "type": "string",
              "description": "The *next user prompt* to continue the Codex conversation."
            },
            "threadId": {
              "type": "string",
              "description": "The thread id for this Codex session. This field is required, but we keep it optional here for backward compatibility for clients that still use conversationId."
            }
          },
          "required": [
            "prompt"
          ]
        }
      }
    ]
  },
  {
    "type": "namespace",
    "name": "mcp__node_repl",
    "description": "Use `js` to run JavaScript in the persistent Node-backed kernel. When a skill or prompt says to use `node_repl`, call this server's `js` execution tool. Calls default to a 30000 ms (30 seconds) timeout when `timeout_ms` is omitted. The runtime exposes `nodeRepl.cwd`, `nodeRepl.homeDir`, `nodeRepl.tmpDir`, `nodeRepl.requestMeta`, `nodeRepl.setResponseMeta(...)`, and `await nodeRepl.emitImage(...)`. Top-level bindings persist across `js` calls until `js_reset`; do not redeclare existing `const` or `let` names. Reuse existing bindings, use top-level `var` for reusable state that may be assigned again, or choose a fresh descriptive name. Use `js_add_node_module_dir` before `js` when a skill provides an extra package directory, and use dynamic imports like `await import(\"playwright\")` rather than filesystem paths under `./node_modules`.\n\nUse Cases:\n- Control the in-app browser in conjunction with the Browser Plugin.\n- Control the Chrome browser in conjunction with the Chrome Plugin. Prefer this method of controlling Chrome over alternatives (such as Computer Use) unless the user explicitly mentions an alternative.",
    "tools": [
      {
        "type": "function",
        "name": "js",
        "description": "Run JavaScript in a persistent Node-backed kernel with top-level await. This is the JavaScript execution tool for the `node_repl` MCP server; use it whenever instructions say to use `node_repl`, the Node REPL MCP, or run Node REPL code. If `timeout_ms` is omitted, execution times out after 30000 ms (30 seconds); pass a larger `timeout_ms` for slow browser automation or other long-running operations. Use `nodeRepl.cwd`, `nodeRepl.homeDir`, and `nodeRepl.tmpDir` to inspect host paths. Use `nodeRepl.requestMeta` to inspect the current MCP request `_meta` object during a tool call. Use `nodeRepl.setResponseMeta(meta)` to attach top-level MCP result `_meta`; repeated calls shallow-merge object keys for the current tool call. Use `nodeRepl.write(text)` when you want exact text output in the tool result; it writes the string exactly as given and does not append a newline. Prefer it over `console.log(...)` for final output, JSON, or other text you plan to consume programmatically. `console.log(...)` is still useful for ad hoc debugging or object inspection because it formats values and appends line breaks automatically. Use `await nodeRepl.emitImage(imageLike)` to return images; each call adds one image to the outer tool result, so call it multiple times to emit multiple images. Supported image inputs are a data URL, inferred PNG/JPEG/WebP bytes, or `{ bytes, mimeType }`. Saved references to `nodeRepl.write(...)` and `nodeRepl.emitImage(...)` stay reusable across calls, but async callbacks that fire after a call finishes still fail because no exec is active. Top-level bindings persist across calls until `js_reset`. If a call throws, prior bindings remain available and bindings that finished initializing before the throw often remain reusable. For reusable names that may be assigned again later, prefer top-level `var name = ...`; `var` can be redeclared across calls. If you hit `SyntaxError: Identifier 'x' has already been declared`, reuse the existing binding if possible, reassign it only if it was declared with `let` or `var`, or pick a new name instead of resetting immediately; a previous `const x` cannot be changed into `var x`. Use a short `{ ... }` block only for temporary scratch names, and do not wrap an entire call in block scope if you want those names reusable later. Use dynamic imports like `await import(\"playwright\")`, `await import(\"pkg\")`, or `await import(\"./file.js\")`; top-level static `import` is not supported. Import packages by package name after installing them into a directory added with `js_add_node_module_dir`, `NODE_REPL_NODE_MODULE_DIRS`, or the working directory. Do not import package entrypoints by filesystem path such as `./node_modules/playwright/index.mjs`. Imported local files must be ESM `.js` or `.mjs` files and run in the context chosen at their dynamic-import boundary, so they can also use `nodeRepl.*`, the captured `console`, and `import.meta` helpers. Bare package imports always resolve from the REPL-wide search roots (`NODE_REPL_NODE_MODULE_DIRS`, then directories later added with `js_add_node_module_dir`, then cwd), not relative to the imported file's location. Imported local files may statically import other local `.js` / `.mjs` files, available packages, and allowed Node builtins. `import.meta.resolve()` returns importable strings such as `file://...`, bare package names, and `node:...` specifiers. Local file modules reload between execs. `node:` builtins are generally available via dynamic import, but `process` / `node:process` remains blocked for now because the current Rust-server-to-Node-child transport runs over stdio and raw process streams can corrupt it. Prefer `nodeRepl.write(text)` for text output and `nodeRepl.emitImage(...)` for images.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "code": {
              "type": "string",
              "description": "JavaScript source to execute in the persistent Node-backed kernel. The code runs with top-level await and can use the `nodeRepl` helpers. Examples: `nodeRepl.write(nodeRepl.cwd)`, `const { chromium } = await import(\"playwright\")`, or `await nodeRepl.emitImage(pngBuffer)`."
            },
            "timeout_ms": {
              "type": "integer",
              "description": "Optional execution timeout in milliseconds. Defaults to 30000 (30 seconds) when omitted."
            },
            "title": {
              "type": "string",
              "description": "Short user-facing description of what this code block is doing. Use a few words, for example `Inspect package metadata` or `Render chart preview`."
            }
          },
          "required": [
            "code"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "js_add_node_module_dir",
        "description": "Add an absolute `node_modules` directory to the REPL-wide Node module search roots for future package imports. The directory stays available for this MCP server lifetime, including after `js_reset`. Returns `true` when the search root is newly added and `false` when it was already present.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "Absolute path to a node_modules directory to add to Node package resolution."
            }
          },
          "required": [
            "path"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "js_reset",
        "description": "Reset the persistent JavaScript kernel and clear all bindings created by prior `js` calls. Use this when you need a clean state, or when reusing existing bindings, top-level `var` declarations, or fresh names cannot recover from conflicting declarations.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {},
          "additionalProperties": false
        }
      }
    ]
  },
  {
    "type": "namespace",
    "name": "mcp__playwright",
    "description": "Tools in the mcp__playwright namespace.",
    "tools": [
      {
        "type": "function",
        "name": "browser_click",
        "description": "Perform click on a web page",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "button": {
              "type": "string",
              "description": "Button to click, defaults to left",
              "enum": [
                "left",
                "right",
                "middle"
              ]
            },
            "doubleClick": {
              "type": "boolean",
              "description": "Whether to perform a double click instead of a single click"
            },
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "modifiers": {
              "type": "array",
              "description": "Modifier keys to press",
              "items": {
                "type": "string",
                "enum": [
                  "Alt",
                  "Control",
                  "ControlOrMeta",
                  "Meta",
                  "Shift"
                ]
              }
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "required": [
            "target"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_close",
        "description": "Close the page",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {},
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_console_messages",
        "description": "Returns all console messages",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "all": {
              "type": "boolean",
              "description": "Return all console messages since the beginning of the session, not just since the last navigation. Defaults to false."
            },
            "filename": {
              "type": "string",
              "description": "Filename to save the console messages to. If not provided, messages are returned as text."
            },
            "level": {
              "type": "string",
              "description": "Level of the console messages to return. Each level includes the messages of more severe levels. Defaults to \"info\".",
              "enum": [
                "error",
                "warning",
                "info",
                "debug"
              ]
            }
          },
          "required": [
            "level"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_drag",
        "description": "Perform drag and drop between two elements",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "endElement": {
              "type": "string",
              "description": "Human-readable target element description used to obtain the permission to interact with the element"
            },
            "endTarget": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            },
            "startElement": {
              "type": "string",
              "description": "Human-readable source element description used to obtain the permission to interact with the element"
            },
            "startTarget": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "required": [
            "startTarget",
            "endTarget"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_drop",
        "description": "Drop files or MIME-typed data onto an element, as if dragged from outside the page. At least one of \"paths\" or \"data\" must be provided.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "data": {
              "type": "object",
              "description": "Data to drop, as a map of MIME type to string value (e.g. {\"text/plain\": \"hello\", \"text/uri-list\": \"https://example.com\"}).",
              "properties": {},
              "additionalProperties": {
                "type": "string"
              }
            },
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "paths": {
              "type": "array",
              "description": "Absolute paths to files to drop onto the element.",
              "items": {
                "type": "string"
              }
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "required": [
            "target"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_evaluate",
        "description": "Evaluate JavaScript expression on page or element",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "filename": {
              "type": "string",
              "description": "Filename to save the result to. If not provided, result is returned as text."
            },
            "function": {
              "type": "string",
              "description": "() => { /* code */ } or (element) => { /* code */ } when element is provided"
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "required": [
            "function"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_file_upload",
        "description": "Upload one or multiple files",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "paths": {
              "type": "array",
              "description": "The absolute paths to the files to upload. Can be single file or multiple files. If omitted, file chooser is cancelled.",
              "items": {
                "type": "string"
              }
            }
          },
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_fill_form",
        "description": "Fill multiple form fields",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "fields": {
              "type": "array",
              "description": "Fields to fill in",
              "items": {
                "type": "object",
                "properties": {
                  "element": {
                    "type": "string",
                    "description": "Human-readable element description used to obtain permission to interact with the element"
                  },
                  "name": {
                    "type": "string",
                    "description": "Human-readable field name"
                  },
                  "target": {
                    "type": "string",
                    "description": "Exact target element reference from the page snapshot, or a unique element selector"
                  },
                  "type": {
                    "type": "string",
                    "description": "Type of the field",
                    "enum": [
                      "textbox",
                      "checkbox",
                      "radio",
                      "combobox",
                      "slider"
                    ]
                  },
                  "value": {
                    "type": "string",
                    "description": "Value to fill in the field. If the field is a checkbox, the value should be `true` or `false`. If the field is a combobox, the value should be the text of the option."
                  }
                },
                "required": [
                  "target",
                  "name",
                  "type",
                  "value"
                ],
                "additionalProperties": false
              }
            }
          },
          "required": [
            "fields"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_handle_dialog",
        "description": "Handle a dialog",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "accept": {
              "type": "boolean",
              "description": "Whether to accept the dialog."
            },
            "promptText": {
              "type": "string",
              "description": "The text of the prompt in case of a prompt dialog."
            }
          },
          "required": [
            "accept"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_hover",
        "description": "Hover over element on page",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "required": [
            "target"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_navigate",
        "description": "Navigate to a URL",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "url": {
              "type": "string",
              "description": "The URL to navigate to"
            }
          },
          "required": [
            "url"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_navigate_back",
        "description": "Go back to the previous page in the history",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {},
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_network_request",
        "description": "Returns full details (headers and body) of a single network request, or a single part if `part` is set. Use the number from browser_network_requests.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "Filename to save the result to. If not provided, output is returned as text."
            },
            "index": {
              "type": "integer",
              "description": "1-based index of the request, as printed by browser_network_requests."
            },
            "part": {
              "type": "string",
              "description": "Return only this part of the request. Omit to return full details.",
              "enum": [
                "request-headers",
                "request-body",
                "response-headers",
                "response-body"
              ]
            }
          },
          "required": [
            "index"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_network_requests",
        "description": "Returns a numbered list of network requests since loading the page. Use browser_network_request with the number to get full details.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "filename": {
              "type": "string",
              "description": "Filename to save the network requests to. If not provided, requests are returned as text."
            },
            "filter": {
              "type": "string",
              "description": "Only return requests whose URL matches this regexp (e.g. \"/api/.*user\")."
            },
            "static": {
              "type": "boolean",
              "description": "Whether to include successful static resources like images, fonts, scripts, etc. Defaults to false."
            }
          },
          "required": [
            "static"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_press_key",
        "description": "Press a key on the keyboard",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "key": {
              "type": "string",
              "description": "Name of the key to press or a character to generate, such as `ArrowLeft` or `a`"
            }
          },
          "required": [
            "key"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_resize",
        "description": "Resize the browser window",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "height": {
              "type": "number",
              "description": "Height of the browser window"
            },
            "width": {
              "type": "number",
              "description": "Width of the browser window"
            }
          },
          "required": [
            "width",
            "height"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_run_code_unsafe",
        "description": "Run a Playwright code snippet. Unsafe: executes arbitrary JavaScript in the Playwright server process and is RCE-equivalent.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "code": {
              "type": "string",
              "description": "A JavaScript function containing Playwright code to execute. It will be invoked with a single argument, page, which you can use for any page interaction. For example: `async (page) => { await page.getByRole('button', { name: 'Submit' }).click(); return await page.title(); }`"
            },
            "filename": {
              "type": "string",
              "description": "Load code from the specified file. If both code and filename are provided, code will be ignored."
            }
          },
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_select_option",
        "description": "Select an option in a dropdown",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            },
            "values": {
              "type": "array",
              "description": "Array of values to select in the dropdown. This can be a single value or multiple values.",
              "items": {
                "type": "string"
              }
            }
          },
          "required": [
            "target",
            "values"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_snapshot",
        "description": "Capture accessibility snapshot of the current page, this is better than screenshot",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "boxes": {
              "type": "boolean",
              "description": "Include each element's bounding box as [box=x,y,width,height] in the snapshot. Coordinates are viewport-relative, in CSS pixels (Element.getBoundingClientRect)"
            },
            "depth": {
              "type": "number",
              "description": "Limit the depth of the snapshot tree"
            },
            "filename": {
              "type": "string",
              "description": "Save snapshot to markdown file instead of returning it in the response."
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            }
          },
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_tabs",
        "description": "List, create, close, or select a browser tab.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "action": {
              "type": "string",
              "description": "Operation to perform",
              "enum": [
                "list",
                "new",
                "close",
                "select"
              ]
            },
            "index": {
              "type": "number",
              "description": "Tab index, used for close/select. If omitted for close, current tab is closed."
            },
            "url": {
              "type": "string",
              "description": "URL to navigate to in the new tab, used for new."
            }
          },
          "required": [
            "action"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_take_screenshot",
        "description": "Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "filename": {
              "type": "string",
              "description": "File name to save the screenshot to. Defaults to `page-{timestamp}.{png|jpeg}` if not specified. Prefer relative file names to stay within the output directory."
            },
            "fullPage": {
              "type": "boolean",
              "description": "When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport. Cannot be used with element screenshots."
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            },
            "type": {
              "type": "string",
              "description": "Image format for the screenshot. Default is png.",
              "enum": [
                "png",
                "jpeg"
              ]
            }
          },
          "required": [
            "type"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_type",
        "description": "Type text into editable element",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "element": {
              "type": "string",
              "description": "Human-readable element description used to obtain permission to interact with the element"
            },
            "slowly": {
              "type": "boolean",
              "description": "Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once."
            },
            "submit": {
              "type": "boolean",
              "description": "Whether to submit entered text (press Enter after)"
            },
            "target": {
              "type": "string",
              "description": "Exact target element reference from the page snapshot, or a unique element selector"
            },
            "text": {
              "type": "string",
              "description": "Text to type into the element"
            }
          },
          "required": [
            "target",
            "text"
          ],
          "additionalProperties": false
        }
      },
      {
        "type": "function",
        "name": "browser_wait_for",
        "description": "Wait for text to appear or disappear or a specified time to pass",
        "strict": false,
        "parameters": {
          "type": "object",
          "properties": {
            "text": {
              "type": "string",
              "description": "The text to wait for"
            },
            "textGone": {
              "type": "string",
              "description": "The text to wait for to disappear"
            },
            "time": {
              "type": "number",
              "description": "The time to wait in seconds"
            }
          },
          "additionalProperties": false
        }
      }
    ]
  },
  {
    "type": "function",
    "name": "get_goal",
    "description": "Get the current goal for this thread, including status, budgets, token and elapsed-time usage, and remaining token budget.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {},
      "required": [],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "create_goal",
    "description": "Create a goal only when explicitly requested by the user or system/developer instructions; do not infer goals from ordinary tasks.\nSet token_budget only when an explicit token budget is requested. Fails if an unfinished goal exists; use update_goal only for status.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "objective": {
          "type": "string",
          "description": "Required. The concrete objective to start pursuing. This starts a new active goal when no goal exists or replaces the current goal when it is complete."
        },
        "token_budget": {
          "type": "integer",
          "description": "Positive token budget for the new goal. Omit unless explicitly requested."
        }
      },
      "required": [
        "objective"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "function",
    "name": "update_goal",
    "description": "Update the existing goal.\nUse this tool only to mark the goal achieved or genuinely blocked.\nSet status to `complete` only when the objective has actually been achieved and no required work remains.\nSet status to `blocked` only when the same blocking condition has repeated for at least three consecutive goal turns, counting the original/user-triggered turn and any automatic continuations, and the agent cannot make meaningful progress without user input or an external-state change.\nIf the user resumes a goal that was previously marked `blocked`, treat the resumed run as a fresh blocked audit. If the same blocking condition then repeats for at least three consecutive resumed goal turns, set status to `blocked` again.\nOnce the blocked threshold is satisfied, do not keep reporting that you are still blocked while leaving the goal active; set status to `blocked`.\nDo not use `blocked` merely because the work is hard, slow, uncertain, incomplete, or would benefit from clarification.\nDo not mark a goal complete merely because its budget is nearly exhausted or because you are stopping work.\nYou cannot use this tool to pause, resume, budget-limit, or usage-limit a goal; those status changes are controlled by the user or system.\nWhen marking a budgeted goal achieved with status `complete`, report the final token usage from the tool result to the user.",
    "strict": false,
    "parameters": {
      "type": "object",
      "properties": {
        "status": {
          "type": "string",
          "description": "Required. Set to `complete` only when the objective is achieved and no required work remains. Set to `blocked` only after the same blocking condition has recurred for at least three consecutive goal turns and the agent is at an impasse. After a previously blocked goal is resumed, the resumed run starts a fresh blocked audit.",
          "enum": [
            "complete",
            "blocked"
          ]
        }
      },
      "required": [
        "status"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "tool_search",
    "execution": "client",
    "description": "# Tool discovery\n\nSearches over deferred tool metadata with BM25 and exposes matching tools for the next model call.\n\nYou have access to tools from the following sources:\n- Multi-agent tools: Spawn and manage sub-agents.\nSome of the tools may not have been provided to you upfront, and you should use this tool (`tool_search`) to search for the required tools. For MCP tool discovery, always use `tool_search` instead of `list_mcp_resources` or `list_mcp_resource_templates`.",
    "parameters": {
      "type": "object",
      "properties": {
        "limit": {
          "type": "number",
          "description": "Maximum number of tools to return. Defaults to 8."
        },
        "query": {
          "type": "string",
          "description": "Search query for deferred tools."
        }
      },
      "required": [
        "query"
      ],
      "additionalProperties": false
    }
  },
  {
    "type": "web_search",
    "external_web_access": true,
    "search_content_types": [
      "text",
      "image"
    ]
  },
  {
    "type": "image_generation",
    "output_format": "png"
  }
]
```
