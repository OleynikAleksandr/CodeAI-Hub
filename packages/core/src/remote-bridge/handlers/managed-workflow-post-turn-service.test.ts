import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import {
  ManagedWorkflowPostTurnService,
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";

test("recogniser matches user-reported colloquial acceptance phrasing", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase(
      "Контракт принимаю, можешь двигаться к фазе 2."
    ),
    "Принимаю контракт"
  );
});

test("recogniser matches all three canonical acceptance phrases", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю контракт"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю контракт"),
    "Подтверждаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Утверждаю контракт"),
    "Утверждаю контракт"
  );
});

test("recogniser matches inflected forms of the contract noun", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю контракта условия"),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Утверждаю по контракту"),
    "Утверждаю контракт"
  );
});

test("recogniser rejects messages without acceptance verb", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Контракт хороший"),
    null
  );
  assert.equal(recognizeManagedContractAcceptancePhrase("Контракт"), null);
});

test("recogniser rejects messages without contract noun", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Принимаю эту правку"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Подтверждаю изменения"),
    null
  );
});

test("recogniser rejects negated acceptance verbs", () => {
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedContractAcceptancePhrase("Не подтверждаю контракт пока"),
    null
  );
});

test("recogniser rejects empty and whitespace-only input", () => {
  assert.equal(recognizeManagedContractAcceptancePhrase(""), null);
  assert.equal(recognizeManagedContractAcceptancePhrase("   "), null);
});

test("stage-gated recogniser matches inside acceptance-eligible stages", () => {
  assert.equal(
    recognizeManagedAcceptanceForStage(
      "application_skeleton",
      "Принимаю контракт"
    ),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("quality_gates", "Подтверждаю контракт"),
    "Подтверждаю контракт"
  );
});

test("stage-gated recogniser ignores acceptance phrases outside Type B stages", () => {
  assert.equal(
    recognizeManagedAcceptanceForStage("diagram_modules", "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("description", "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage(null, "Принимаю контракт"),
    null
  );
  assert.equal(
    recognizeManagedAcceptanceForStage(undefined, "Принимаю контракт"),
    null
  );
});

test("post-turn service does not dispatch via gateway without explicit handle() invocation", () => {
  const dispatched: Array<{
    readonly content: unknown;
    readonly sessionId: string;
  }> = [];
  // Constructing the service wires up the gateway but must not synchronously
  // dispatch a provider-visible message. Provider-visible corrections are
  // gated on an explicit handle() call originating from a terminal event,
  // not on read-model snapshots or constructor side-effects.
  const _service = new ManagedWorkflowPostTurnService({
    developmentTreeAgentSessions: {
      gateway: {
        handleMessage: (sessionId, content) => {
          dispatched.push({ content, sessionId });
          return Promise.resolve();
        },
      },
      providerId: "codexCli",
    },
    logger: new Logger("error"),
  });
  assert.deepEqual(dispatched, []);
});
