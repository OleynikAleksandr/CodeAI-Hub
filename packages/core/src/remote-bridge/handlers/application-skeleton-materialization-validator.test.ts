import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateApplicationSkeletonMaterialization } from "./application-skeleton-materialization-validator";

const MATERIALIZED_MARKDOWN = `# Application Skeleton

## Status

- \`reviewState\`: \`materialized\`
- \`accepted\`: \`true\`
- \`materialized\`: \`true\`
- \`materializationState\`: \`materialized\`

## Materialized State

Application Skeleton is accepted and materialized.
`;
const MISSING_PART_ID_RE =
  /Product Part is missing partId: product-parts\/project-manager/;
const MISSING_CLUSTER_ID_RE =
  /Cluster is missing clusterId: product-parts\/project-manager\/clusters\/workflow-ui/;
const MISSING_CLUSTER_MODULE_ID_RE =
  /Module is missing moduleId: product-parts\/project-manager\/clusters\/workflow-ui\/modules\/navigation/;
const MISSING_STANDALONE_MODULE_ID_RE =
  /Module is missing moduleId: product-parts\/project-manager\/modules\/settings/;

const makeWorkspace = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "codeai-skeleton-validator-"));

const createDirs = async (
  workspaceRoot: string,
  relativePaths: readonly string[]
): Promise<void> => {
  for (const relativePath of relativePaths) {
    await mkdir(path.join(workspaceRoot, relativePath), { recursive: true });
  }
};

test("materialized skeleton validation requires canonical identifier fields", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const paths = [
      "product-parts/project-manager",
      "product-parts/project-manager/clusters/workflow-ui",
      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
      "product-parts/project-manager/modules/settings",
    ];
    await createDirs(workspaceRoot, paths);

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: paths,
        reviewState: "materialized",
        sourceRoot: "product-parts",
        productParts: [
          {
            codePath: "product-parts/project-manager",
            clusters: [
              {
                codePath: "product-parts/project-manager/clusters/workflow-ui",
                modules: [
                  {
                    codePath:
                      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
                  },
                ],
              },
            ],
            standaloneModules: [
              {
                codePath: "product-parts/project-manager/modules/settings",
              },
            ],
          },
        ],
      },
    });

    assert.equal(result.observedMaterialization, true);
    const errors = result.validationErrors.join("\n");
    assert.match(errors, MISSING_PART_ID_RE);
    assert.match(errors, MISSING_CLUSTER_ID_RE);
    assert.match(errors, MISSING_CLUSTER_MODULE_ID_RE);
    assert.match(errors, MISSING_STANDALONE_MODULE_ID_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("materialized skeleton happy path passes validation when canonical identifiers exist", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const paths = [
      "product-parts/project-manager",
      "product-parts/project-manager/clusters/workflow-ui",
      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
      "product-parts/project-manager/modules/settings",
    ];
    await createDirs(workspaceRoot, paths);

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: paths,
        reviewState: "materialized",
        sourceRoot: "product-parts",
        productParts: [
          {
            id: "project-manager",
            codePath: "product-parts/project-manager",
            clusters: [
              {
                id: "workflow-ui",
                codePath: "product-parts/project-manager/clusters/workflow-ui",
                modules: [
                  {
                    id: "navigation",
                    codePath:
                      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
                  },
                ],
              },
            ],
            standaloneModules: [
              {
                id: "settings",
                codePath: "product-parts/project-manager/modules/settings",
              },
            ],
          },
        ],
      },
    });

    assert.equal(result.observedMaterialization, true);
    assert.deepEqual(result.validationErrors, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("materialized skeleton normalizes materializedPaths shape (trailing slashes, whitespace, duplicates)", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const realPaths = [
      "product-parts/project-manager",
      "product-parts/project-manager/clusters/workflow-ui",
      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
      "product-parts/project-manager/modules/settings",
    ];
    await createDirs(workspaceRoot, realPaths);

    const noisyPaths = [
      "  product-parts/project-manager/  ",
      "product-parts/project-manager",
      "product-parts/project-manager/clusters/workflow-ui///",
      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
      "product-parts/project-manager/modules/settings/",
      "",
      "   ",
    ];

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: noisyPaths,
        reviewState: "materialized",
        sourceRoot: "product-parts",
        productParts: [
          {
            id: "project-manager",
            codePath: "product-parts/project-manager",
            clusters: [
              {
                id: "workflow-ui",
                codePath: "product-parts/project-manager/clusters/workflow-ui",
                modules: [
                  {
                    id: "navigation",
                    codePath:
                      "product-parts/project-manager/clusters/workflow-ui/modules/navigation",
                  },
                ],
              },
            ],
            standaloneModules: [
              {
                id: "settings",
                codePath: "product-parts/project-manager/modules/settings",
              },
            ],
          },
        ],
      },
    });

    assert.equal(result.observedMaterialization, true);
    assert.deepEqual(result.validationErrors, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
