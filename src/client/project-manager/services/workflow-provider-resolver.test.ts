import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderStackDescriptor } from "../../../types/provider";
import type { WorkflowStateSnapshot } from "./workflow-state-client";
import { resolvePreferredWorkflowProviderId } from "./workflow-provider-resolver";

const createWorkflowState = (
  overrides?: Partial<WorkflowStateSnapshot>
): WorkflowStateSnapshot => ({
  workspaceSlug: "demo-workspace",
  updatedAt: "2026-04-13T09:00:00.000Z",
  stages: {
    description: "completed",
    virtual_simulation: "idle",
    diagram_modules: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
    },
  },
  ...overrides,
});

const createProviders = (
  overrides?: Partial<Record<ProviderStackDescriptor["id"], Partial<ProviderStackDescriptor>>>
): readonly ProviderStackDescriptor[] => [
  {
    id: "claudeCodeCli",
    title: "Claude",
    description: "Claude CLI",
    connected: true,
    statusMessage: null,
    ...overrides?.claudeCodeCli,
  },
  {
    id: "codexCli",
    title: "Codex",
    description: "Codex CLI",
    connected: true,
    statusMessage: null,
    ...overrides?.codexCli,
  },
  {
    id: "geminiCli",
    title: "Gemini",
    description: "Gemini CLI",
    connected: true,
    statusMessage: null,
    ...overrides?.geminiCli,
  },
];

test("virtual simulation inherits provider from description primary session", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-04-13T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "geminiCli",
          providerSessionId: "gemini-session-1",
          jsonlPath: "/tmp/gemini.jsonl",
        },
      },
    }),
    providers: createProviders(),
    stage: "virtual_simulation",
  });

  assert.equal(providerId, "geminiCli");
});

test("diagram modules inherits provider from latest virtual simulation continuity segment", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-04-13T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "codexCli",
          providerSessionId: "codex-description-session",
          jsonlPath: "/tmp/codex-description.jsonl",
        },
      },
      continuity: {
        chains: [
          {
            rootSessionId: "vs-root-old",
            workspaceSlug: "demo-workspace",
            stage: "virtual_simulation",
            updatedAt: "2026-04-13T08:30:00.000Z",
            segments: [
              {
                sessionId: "vs-old",
                providerId: "claudeCodeCli",
                providerSessionId: "claude-vs-session",
                createdAt: "2026-04-13T08:30:00.000Z",
              },
            ],
          },
          {
            rootSessionId: "vs-root-new",
            workspaceSlug: "demo-workspace",
            stage: "virtual_simulation",
            updatedAt: "2026-04-13T08:45:00.000Z",
            segments: [
              {
                sessionId: "vs-new",
                providerId: "geminiCli",
                providerSessionId: "gemini-vs-session",
                createdAt: "2026-04-13T08:45:00.000Z",
              },
            ],
          },
        ],
      },
    }),
    providers: createProviders(),
    stage: "diagram_modules",
  });

  assert.equal(providerId, "geminiCli");
});

test("resolver falls back to first connected provider when inherited one is disconnected", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-04-13T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "codexCli",
          providerSessionId: "codex-session-1",
          jsonlPath: "/tmp/codex.jsonl",
        },
      },
    }),
    providers: createProviders({
      claudeCodeCli: { connected: false },
      codexCli: { connected: false },
    }),
    stage: "virtual_simulation",
  });

  assert.equal(providerId, "geminiCli");
});

test("legacy call sites without stage keep description-based fallback", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-04-13T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "claudeCodeCli",
          providerSessionId: "claude-session-1",
          jsonlPath: "/tmp/claude.jsonl",
        },
      },
    }),
    providers: createProviders(),
  });

  assert.equal(providerId, "claudeCodeCli");
});
