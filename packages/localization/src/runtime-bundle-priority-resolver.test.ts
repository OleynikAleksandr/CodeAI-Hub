import assert from "node:assert/strict";
import test from "node:test";
import { resolveWithBoundedConcurrency } from "./runtime-bundle-priority-resolver";

test("resolveWithBoundedConcurrency caps workers and preserves keyed results", async () => {
  const categories = [
    "user_guidance",
    "system_feedback",
    "interactive_templates",
  ] as const;
  let activeJobs = 0;
  let maxActiveJobs = 0;

  const resolved = await resolveWithBoundedConcurrency(
    categories,
    async (category) => {
      activeJobs += 1;
      maxActiveJobs = Math.max(maxActiveJobs, activeJobs);
      await new Promise((resolve) =>
        setTimeout(resolve, category === "user_guidance" ? 20 : 5)
      );
      activeJobs -= 1;
      return category.toUpperCase();
    },
    2
  );

  assert.equal(maxActiveJobs, 2);
  assert.deepEqual(resolved, {
    interactive_templates: "INTERACTIVE_TEMPLATES",
    system_feedback: "SYSTEM_FEEDBACK",
    user_guidance: "USER_GUIDANCE",
  });
});
