import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import {
  handleApplicationSkeletonAcceptContract,
  handleQualityGatesAcceptContract,
} from "./http-api-managed-stage-accept-contract";
import type { ManagedWorkflowPostTurnService } from "./managed-workflow-post-turn-service";

interface CapturedResponse {
  body?: Record<string, unknown>;
  status?: number;
}

const buildResponse = (captured: CapturedResponse): Response =>
  ({
    json(payload: unknown) {
      captured.body = payload as Record<string, unknown>;
      return this;
    },
    status(code: number) {
      captured.status = code;
      return this;
    },
  }) as unknown as Response;

const buildService = (
  recorded: Array<{
    readonly sessionId: string;
    readonly source: string;
  }>,
  decision:
    | { kind: "accepted" }
    | {
        kind: "rejected";
        reasons: readonly string[];
      }
): ManagedWorkflowPostTurnService =>
  ({
    handleApplicationSkeletonAcceptContractCommand: (params: {
      sessionId: string;
      source: string;
    }) => {
      recorded.push(params);
      return Promise.resolve({
        ...decision,
        stage: "application_skeleton" as const,
      });
    },
  }) as unknown as ManagedWorkflowPostTurnService;

test("handler returns 400 when sessionId is missing", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildService(recorded, { kind: "accepted" });
  await handleApplicationSkeletonAcceptContract(
    { body: {} } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(captured.status, 400);
  assert.deepEqual(captured.body, { error: "Missing sessionId" });
  assert.equal(recorded.length, 0);
});

test("handler delegates to service and returns accepted JSON", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildService(recorded, { kind: "accepted" });
  await handleApplicationSkeletonAcceptContract(
    { body: { sessionId: "session-1" } } as Request,
    buildResponse(captured),
    service
  );
  assert.deepEqual(recorded, [{ sessionId: "session-1", source: "ui-button" }]);
  assert.deepEqual(captured.body, {
    stage: "application_skeleton",
    status: "accepted",
  });
});

test("handler honours typed-fallback source when explicitly requested", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildService(recorded, { kind: "accepted" });
  await handleApplicationSkeletonAcceptContract(
    {
      body: { sessionId: "session-1", source: "typed-fallback" },
    } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(recorded[0]?.source, "typed-fallback");
});

test("handler returns 409 with reasons when service rejects", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildService(recorded, {
    kind: "rejected",
    reasons: ["draft incomplete"],
  });
  await handleApplicationSkeletonAcceptContract(
    { body: { sessionId: "session-1" } } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(captured.status, 409);
  assert.deepEqual(captured.body, {
    error: "rejected",
    reasons: ["draft incomplete"],
    stage: "application_skeleton",
  });
});

const buildQualityGatesService = (
  recorded: Array<{
    readonly sessionId: string;
    readonly source: string;
  }>,
  decision:
    | { kind: "accepted" }
    | {
        kind: "rejected";
        reasons: readonly string[];
      }
): ManagedWorkflowPostTurnService =>
  ({
    handleQualityGatesAcceptContractCommand: (params: {
      sessionId: string;
      source: string;
    }) => {
      recorded.push(params);
      return Promise.resolve({
        ...decision,
        stage: "quality_gates" as const,
      });
    },
  }) as unknown as ManagedWorkflowPostTurnService;

test("quality gates handler returns 400 when sessionId is missing", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildQualityGatesService(recorded, { kind: "accepted" });
  await handleQualityGatesAcceptContract(
    { body: {} } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(captured.status, 400);
  assert.deepEqual(captured.body, { error: "Missing sessionId" });
  assert.equal(recorded.length, 0);
});

test("quality gates handler delegates to service and returns accepted JSON", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildQualityGatesService(recorded, { kind: "accepted" });
  await handleQualityGatesAcceptContract(
    { body: { sessionId: "qg-session-1" } } as Request,
    buildResponse(captured),
    service
  );
  assert.deepEqual(recorded, [
    { sessionId: "qg-session-1", source: "ui-button" },
  ]);
  assert.deepEqual(captured.body, {
    stage: "quality_gates",
    status: "accepted",
  });
});

test("quality gates handler honours typed-fallback source when explicitly requested", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildQualityGatesService(recorded, { kind: "accepted" });
  await handleQualityGatesAcceptContract(
    {
      body: { sessionId: "qg-session-1", source: "typed-fallback" },
    } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(recorded[0]?.source, "typed-fallback");
});

test("quality gates handler falls back to ui-button for unknown source values", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildQualityGatesService(recorded, { kind: "accepted" });
  await handleQualityGatesAcceptContract(
    {
      body: { sessionId: "qg-session-1", source: "voice-note" },
    } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(recorded[0]?.source, "ui-button");
  assert.deepEqual(captured.body, {
    stage: "quality_gates",
    status: "accepted",
  });
});

test("quality gates handler returns 409 with reasons when service rejects", async () => {
  const captured: CapturedResponse = {};
  const recorded: Array<{ sessionId: string; source: string }> = [];
  const service = buildQualityGatesService(recorded, {
    kind: "rejected",
    reasons: ["draft contract missing"],
  });
  await handleQualityGatesAcceptContract(
    { body: { sessionId: "qg-session-1" } } as Request,
    buildResponse(captured),
    service
  );
  assert.equal(captured.status, 409);
  assert.deepEqual(captured.body, {
    error: "rejected",
    reasons: ["draft contract missing"],
    stage: "quality_gates",
  });
});
