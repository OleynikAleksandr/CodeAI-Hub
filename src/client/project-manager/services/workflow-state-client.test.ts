import assert from "node:assert/strict";
import test from "node:test";
import { fetchWorkflowState } from "./workflow-state-client";

const installFetchStub = (payload: unknown): void => {
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload),
      }),
  });
};

const createWorkflowPayload = (developmentTree: unknown): unknown => ({
  state: {
    workspaceSlug: "demo",
    updatedAt: "2026-05-04T10:00:00.000Z",
    stages: {},
  },
  continuity: { chains: [] },
  developmentTree,
  gating: {
    blocked: {
      description: false,
      virtual_simulation: false,
      diagram_modules: false,
    },
  },
});

test("fetchWorkflowState parses optional development tree readiness", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "ui-shell",
          readiness: "in_progress",
          status: "materialized",
          clusters: [
            {
              id: "layout",
              readiness: "ready",
              modules: [
                {
                  id: "main-area",
                  readiness: "ready",
                  title: "Main Area",
                },
              ],
            },
          ],
          standaloneModules: [
            {
              id: "theme-engine",
              readiness: "idle",
              title: "Theme Engine",
            },
          ],
        },
      ],
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });

  const part = state?.developmentTree?.parts[0];
  assert.equal(part?.readiness, "in_progress");
  assert.equal(part?.clusters[0]?.readiness, "ready");
  assert.equal(part?.clusters[0]?.modules[0]?.readiness, "ready");
  assert.equal(part?.standaloneModules[0]?.readiness, "idle");
});

test("fetchWorkflowState stays compatible when readiness is absent or invalid", async () => {
  installFetchStub(
    createWorkflowPayload({
      parts: [
        {
          id: "core",
          readiness: "blocked",
          status: "skeleton",
          clusters: [],
          standaloneModules: [{ id: "bridge", title: "Bridge" }],
        },
      ],
    })
  );

  const state = await fetchWorkflowState({
    httpUrl: "http://127.0.0.1:8080",
    workspaceSlug: "demo",
  });

  const part = state?.developmentTree?.parts[0];
  assert.equal(part?.readiness, undefined);
  assert.equal(part?.standaloneModules[0]?.readiness, undefined);
});
