import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
const OPEN_QUESTIONS_RE = /openQuestions must be empty/;
const MISSING_LOCKFILE_RE = /lockfile is missing for packageManager npm/;
const MISSING_TSCONFIG_RE = /config file is missing: tsconfig\.json/;
const MISSING_FIRST_WAVE_ENTRYPOINT_RE =
  /first-wave entrypoint is missing: product-parts\/project-manager\/src\/index\.ts/;
const INVALID_FIRST_WAVE_ENTRYPOINT_RE =
  /first-wave entrypoint must be production path: \.codeai-hub\/tmp\/generated\.ts/;
const MISSING_LINT_SCRIPT_RE = /required script is missing: lint/;

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

const createFoundationFiles = async (workspaceRoot: string): Promise<void> => {
  await mkdir(path.join(workspaceRoot, "product-parts/project-manager/src"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify({ scripts: { build: "tsc", lint: "biome check ." } })
  );
  await writeFile(path.join(workspaceRoot, "package-lock.json"), "{}");
  await writeFile(path.join(workspaceRoot, "tsconfig.json"), "{}");
  await writeFile(
    path.join(workspaceRoot, "product-parts/project-manager/src/index.ts"),
    "export {};\n"
  );
};

const FOUNDATION_FIELDS = {
  openQuestions: [],
  packageManager: "npm",
  projectFoundation: {
    configFiles: ["tsconfig.json"],
    firstWaveEntrypoints: ["product-parts/project-manager/src/index.ts"],
    installCommand: "npm ci",
    requiredScripts: ["build", "lint"],
  },
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
    await createFoundationFiles(workspaceRoot);

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: paths,
        ...FOUNDATION_FIELDS,
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
    await createFoundationFiles(workspaceRoot);

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: paths,
        ...FOUNDATION_FIELDS,
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
    await createFoundationFiles(workspaceRoot);

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
        ...FOUNDATION_FIELDS,
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

test("materialized skeleton validation requires project foundation evidence", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    await createDirs(workspaceRoot, ["product-parts/project-manager"]);
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      JSON.stringify({ scripts: { build: "tsc" } })
    );

    const result = await validateApplicationSkeletonMaterialization({
      markdown: MATERIALIZED_MARKDOWN,
      workspaceRoot,
      mapJson: {
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        materializedPaths: ["product-parts/project-manager"],
        openQuestions: ["Choose the test runner"],
        packageManager: "npm",
        projectFoundation: {
          configFiles: ["tsconfig.json"],
          firstWaveEntrypoints: [
            "product-parts/project-manager/src/index.ts",
            ".codeai-hub/tmp/generated.ts",
          ],
          installCommand: "npm ci",
          requiredScripts: ["build", "lint"],
        },
        reviewState: "materialized",
        sourceRoot: "product-parts",
        productParts: [
          {
            id: "project-manager",
            codePath: "product-parts/project-manager",
          },
        ],
      },
    });

    assert.equal(result.observedMaterialization, true);
    const errors = result.validationErrors.join("\n");
    assert.match(errors, OPEN_QUESTIONS_RE);
    assert.match(errors, MISSING_LOCKFILE_RE);
    assert.match(errors, MISSING_TSCONFIG_RE);
    assert.match(errors, MISSING_FIRST_WAVE_ENTRYPOINT_RE);
    assert.match(errors, INVALID_FIRST_WAVE_ENTRYPOINT_RE);
    assert.match(errors, MISSING_LINT_SCRIPT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
