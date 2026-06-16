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

test("SessionTranslationDispatcher accepts visible assistant dialog", () => {
  const dispatcher = new SessionTranslationDispatcher();

  assert.equal(
    dispatcher.shouldTranslateDialogMessage({
      content: "I will check the referenced files.",
      role: "assistant",
    }),
    true
  );
});

test("SessionTranslationDispatcher translates only Core-deferred user dialog", () => {
  const dispatcher = new SessionTranslationDispatcher();

  assert.equal(
    dispatcher.shouldTranslateDialogMessage({
      content: "Core acceptance check failed.",
      role: "user",
      tag: "core-deferred-user",
    }),
    true
  );
  assert.equal(
    dispatcher.shouldTranslateDialogMessage({
      content: "Actual human input.",
      role: "user",
    }),
    false
  );
});
