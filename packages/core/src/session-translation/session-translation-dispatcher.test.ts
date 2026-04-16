import assert from "node:assert/strict";
import test from "node:test";
import { SessionTranslationDispatcher } from "./session-translation-dispatcher";

test("SessionTranslationDispatcher allows two concurrent jobs", async () => {
  const dispatcher = new SessionTranslationDispatcher();
  let activeJobs = 0;
  let maxActiveJobs = 0;

  const runJob = (label: string, delayMs: number) =>
    dispatcher.dispatch(async () => {
      activeJobs += 1;
      maxActiveJobs = Math.max(maxActiveJobs, activeJobs);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      activeJobs -= 1;
      return label;
    });

  const [first, second, third] = await Promise.all([
    runJob("first", 20),
    runJob("second", 20),
    runJob("third", 1),
  ]);

  assert.deepEqual([first, second, third], ["first", "second", "third"]);
  assert.equal(maxActiveJobs, 2);
});
