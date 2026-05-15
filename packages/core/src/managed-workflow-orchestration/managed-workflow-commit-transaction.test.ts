import assert from "node:assert/strict";
import test from "node:test";
import { ManagedWorkflowCommitTransaction } from "./managed-workflow-commit-transaction";

const PSEUDO_HASH_PATTERN = /not a real Git hash/u;

const createTransaction = () => {
  const transaction = new ManagedWorkflowCommitTransaction();
  transaction.recordRequest({
    effect: {
      allowedPaths: ["doc/TODO/stages/application-skeleton/todo-plan.md"],
      expectedCommitMessage: "docs: accept application skeleton contract",
      kind: "request_commit",
      stageId: "application_skeleton",
    },
    requestId: "commit-1",
  });
  return transaction;
};

test("commit transaction records intended commit decisions without executing Git", () => {
  const transaction = createTransaction();

  assert.deepEqual(transaction.listPending(), [
    {
      allowedPaths: ["doc/TODO/stages/application-skeleton/todo-plan.md"],
      expectedCommitMessage: "docs: accept application skeleton contract",
      requestId: "commit-1",
      stageId: "application_skeleton",
    },
  ]);
});

test("commit transaction refuses pseudo-hashes", () => {
  const transaction = createTransaction();

  assert.throws(
    () =>
      transaction.finalize({
        hash: "not-created-user-accepted-without-review-revision",
        requestId: "commit-1",
      }),
    PSEUDO_HASH_PATTERN
  );
});

test("commit transaction finalizes only with a real Git hash-shaped value", () => {
  const transaction = createTransaction();
  const finalized = transaction.finalize({
    hash: "abc1234",
    requestId: "commit-1",
  });

  assert.equal(finalized.hash, "abc1234");
  assert.equal(transaction.listPending().length, 0);
});
