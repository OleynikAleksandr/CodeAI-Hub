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
    application_skeleton: "idle",
    quality_gates: "idle",
  },
  continuity: { chains: [] },
  lastActive: null,
  description: null,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
      application_skeleton: false,
      quality_gates: false,
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
    id: "kimiCode",
    title: "Kimi",
    description: "Kimi Code",
    connected: true,
    statusMessage: null,
    ...overrides?.kimiCode,
  },
];

test("virtual simulation inherits provider from description primary session", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-04-13T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "kimiCode",
          providerSessionId: "kimi-session-1",
          jsonlPath: "/tmp/kimi.jsonl",
        },
      },
    }),
    providers: createProviders(),
    stage: "virtual_simulation",
  });

  assert.equal(providerId, "kimiCode");
});

test("virtual simulation inherits provider from description continuity when primary session is missing", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-05-24T06:31:22.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      continuity: {
        chains: [
          {
            rootSessionId: "description-root",
            workspaceSlug: "demo-workspace",
            stage: "description",
            updatedAt: "2026-05-24T06:31:25.000Z",
            segments: [
              {
                sessionId: "description-session",
                providerId: "codexCli",
                providerSessionId: "codex-native-description",
                createdAt: "2026-05-24T06:31:04.000Z",
              },
            ],
          },
        ],
      },
    }),
    providers: createProviders(),
    stage: "virtual_simulation",
  });

  assert.equal(providerId, "codexCli");
});

test("virtual simulation inherits Kimi provider from description primary session", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-05-19T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "kimiCode",
          providerSessionId: "kimi-description-session",
          jsonlPath: "/tmp/kimi-description.jsonl",
        },
      },
    }),
    providers: createProviders(),
    stage: "virtual_simulation",
  });

  assert.equal(providerId, "kimiCode");
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
                providerId: "kimiCode",
                providerSessionId: "kimi-vs-session",
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

  assert.equal(providerId, "kimiCode");
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

  assert.equal(providerId, "kimiCode");
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

test("quality gates ignores providers without search capability", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      continuity: {
        chains: [
          {
            rootSessionId: "skeleton-root",
            workspaceSlug: "demo-workspace",
            stage: "application_skeleton",
            updatedAt: "2026-05-22T08:00:00.000Z",
            segments: [
              {
                sessionId: "skeleton-session",
                providerId: "kimiCode",
                providerSessionId: "kimi-skeleton",
                createdAt: "2026-05-22T08:00:00.000Z",
              },
            ],
          },
        ],
      },
    }),
    providers: createProviders({
      claudeCodeCli: { connected: false },
    }),
    stage: "quality_gates",
  });

  assert.equal(providerId, "codexCli");
});

test("quality gates returns no provider when only non-search providers exist", () => {
  const providerId = resolvePreferredWorkflowProviderId({
    workflowState: createWorkflowState({
      description: {
        updatedAt: "2026-05-22T08:00:00.000Z",
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
        primarySession: {
          providerId: "kimiCode",
          providerSessionId: "kimi-description-session",
          jsonlPath: "/tmp/kimi-description.jsonl",
        },
      },
    }),
    providers: createProviders({
      claudeCodeCli: { connected: false },
      codexCli: { connected: false },
    }).filter((provider) => provider.id === "kimiCode"),
    stage: "quality_gates",
  });

  assert.equal(providerId, null);
});
