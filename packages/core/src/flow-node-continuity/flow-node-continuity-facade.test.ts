import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FlowNodeContinuityFacade } from "./flow-node-continuity-facade";

const createFacade = (): FlowNodeContinuityFacade =>
  new FlowNodeContinuityFacade({
    templatesDir: mkdtempSync(path.join(os.tmpdir(), "flow-node-continuity-")),
    preemptRemainingPercentThreshold: 80,
  });

test("FlowNodeContinuityFacade matches modern description sessions (runSlug=null)", () => {
  const facade = createFacade();
  assert.equal(
    facade.isEligibleForRollover({
      stageId: "description",
      runSlug: null,
    }),
    true
  );
  assert.equal(
    facade.isEligibleForRollover({
      stageId: "description",
      runSlug: "collector",
    }),
    false
  );
});

test("FlowNodeContinuityFacade starts preemptive rollover only for eligible sessions", () => {
  const facade = createFacade();
  assert.equal(
    facade.shouldStartSilentPreemptiveRollover({
      stageId: "description",
      runSlug: null,
      remainingPercent: 80,
    }),
    true
  );
  assert.equal(
    facade.shouldStartSilentPreemptiveRollover({
      stageId: "description",
      runSlug: "collector",
      remainingPercent: 80,
    }),
    false
  );
  assert.equal(
    facade.shouldStartSilentPreemptiveRollover({
      stageId: "virtual_simulation",
      runSlug: null,
      remainingPercent: 10,
    }),
    false
  );
});
