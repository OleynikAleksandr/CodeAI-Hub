import assert from "node:assert/strict";
import test from "node:test";
import { DraftReadinessClassifier } from "./draft-readiness-classifier";

const createDraft = (content: string): string => `---
status: draft
outdated: false
orphaned: false
---
# Draft

## Responsibility
<!-- agent-fill -->
${content}
<!-- /agent-fill -->
`;

test("DraftReadinessClassifier returns idle when agent-fill sections are empty", () => {
  const result = new DraftReadinessClassifier().classify({
    kind: "product_part",
    files: [
      {
        fileName: "ProductPartDevelopmentBrief.draft.md",
        content: createDraft(""),
      },
    ],
  });

  assert.equal(result.readiness, "idle");
  assert.equal(result.files[0]?.filledAgentFillSections, 0);
});

test("DraftReadinessClassifier returns in_progress for partial or blocked drafts", () => {
  const result = new DraftReadinessClassifier().classify({
    kind: "module",
    files: [
      {
        fileName: "ModuleSpec.draft.md",
        content: createDraft(
          "Implementation is described.\nTODO: confirm API."
        ),
      },
      {
        fileName: "ModuleFacadeContract.draft.md",
        content: createDraft("Public boundary is described."),
      },
    ],
  });

  assert.equal(result.readiness, "in_progress");
});

test("DraftReadinessClassifier returns ready when all required drafts are filled", () => {
  const result = new DraftReadinessClassifier().classify({
    kind: "cluster",
    files: [
      {
        fileName: "ClusterDescription.draft.md",
        content: createDraft("Coordinates modules."),
      },
      {
        fileName: "ClusterFacadeContract.draft.md",
        content: createDraft("Exposes the cluster facade."),
      },
    ],
  });

  assert.equal(result.readiness, "ready");
});

test("DraftReadinessClassifier treats outdated or orphaned drafts as in_progress", () => {
  const result = new DraftReadinessClassifier().classify({
    kind: "product_part",
    files: [
      {
        fileName: "ProductPartDevelopmentBrief.draft.md",
        content: createDraft("Responsibility is described.").replace(
          "orphaned: false",
          "orphaned: true"
        ),
      },
    ],
  });

  assert.equal(result.readiness, "in_progress");
});

test("DraftReadinessClassifier rejects unbalanced agent-fill markers", () => {
  const result = new DraftReadinessClassifier().classify({
    kind: "cluster",
    files: [
      {
        fileName: "ClusterDescription.draft.md",
        content: `${createDraft("Cluster responsibility is described.")}
<!-- /agent-fill -->
`,
      },
      {
        fileName: "ClusterFacadeContract.draft.md",
        content: createDraft("Cluster facade contract is described."),
      },
    ],
  });

  assert.equal(result.readiness, "in_progress");
  assert.equal(result.files[0]?.readiness, "in_progress");
});
