import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ApplicationSkeletonCoreMaterializer } from "./application-skeleton-core-materializer";

const WORKSPACE_SLUG = "demo-workspace";
const NODE_MODULES_IGNORE_RE = /node_modules\//u;
const DIST_IGNORE_RE = /dist\//u;
const LOCAL_STATE_IGNORE_RE = /\.codeai-hub\/state\//u;
const MARKDOWN_TITLE_RE = /^# Application Skeleton/mu;
const CORE_MATERIALIZER_RE = /Core-owned scaffold materializer/u;
const MATERIALIZED_STATE_RE = /materializationState`\s*:\s*`materialized/u;
const PYTHON_MAIN_MODULE_RE = /MODULE_ID = "main-py"/u;
const GO_MAIN_PACKAGE_RE = /^package main/mu;
const TYPESCRIPT_ENTRYPOINT_RE = /^export const moduleId = "index-ts";$/mu;
const TSX_CLUSTER_INCLUDE_RE = /clusters\/\*\*\/\*\.tsx/u;

const createWorkspace = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "application-skeleton-materializer-"));

const writeDraftMap = async (workspaceRoot: string): Promise<void> => {
  const stageDir = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "application_skeleton"
  );
  await mkdir(stageDir, { recursive: true });
  await writeFile(
    path.join(stageDir, "application-skeleton-map.json"),
    `${JSON.stringify(
      {
        accepted: false,
        materializationState: "not_started",
        materialized: false,
        packageManager: "npm",
        productParts: [
          {
            clusters: [
              {
                codePath: "product-parts/core-runtime/clusters/remote-bridge",
                id: "remote-bridge",
                modules: [
                  {
                    codePath:
                      "product-parts/core-runtime/clusters/remote-bridge/modules/session-gateway",
                    id: "session-gateway",
                  },
                ],
              },
            ],
            codePath: "product-parts/core-runtime",
            id: "core-runtime",
            standaloneModules: [
              {
                codePath: "product-parts/core-runtime/modules/health-signal",
                id: "health-signal",
              },
            ],
          },
        ],
        projectFoundation: {
          configFiles: [".gitignore", "tsconfig.json"],
          firstWaveEntrypoints: [
            "product-parts/core-runtime/src/core-entry.ts",
          ],
          installCommand: "npm ci",
          requiredScripts: ["build"],
        },
        reviewState: "draft",
        schema: "codeai-application-skeleton-v1",
        sourceRoot: "product-parts",
        stack: {
          frameworks: ["node"],
          languages: ["TypeScript"],
          runtimes: ["Node.js"],
        },
        workspaceRoot: ".",
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

const readJson = async (
  workspaceRoot: string,
  relativePath: string
): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(path.join(workspaceRoot, relativePath), "utf8"));

const assertPathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<void> => {
  assert.ok(
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null),
    `expected ${relativePath} to exist`
  );
};

const assertPathMissing = async (
  workspaceRoot: string,
  relativePath: string
): Promise<void> => {
  assert.equal(
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null),
    null,
    `expected ${relativePath} to be absent`
  );
};

test("Core materializer creates scaffold and materialized state from accepted Application Skeleton map", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeDraftMap(workspaceRoot);

    const result = await new ApplicationSkeletonCoreMaterializer().materialize({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    for (const relativePath of [
      ".gitignore",
      ".npmrc",
      "package-lock.json",
      "package.json",
      "tsconfig.json",
      "tsconfig.base.json",
      "product-parts/core-runtime/package.json",
      "product-parts/core-runtime/tsconfig.json",
      "product-parts/core-runtime/README.md",
      "product-parts/core-runtime/clusters/remote-bridge/README.md",
      "product-parts/core-runtime/clusters/remote-bridge/modules/session-gateway/README.md",
      "product-parts/core-runtime/modules/health-signal/README.md",
      "product-parts/core-runtime/src/core-entry.ts",
    ]) {
      await assertPathExists(workspaceRoot, relativePath);
    }

    const gitignore = await readFile(
      path.join(workspaceRoot, ".gitignore"),
      "utf8"
    );
    assert.match(gitignore, NODE_MODULES_IGNORE_RE);
    assert.match(gitignore, DIST_IGNORE_RE);
    assert.match(gitignore, LOCAL_STATE_IGNORE_RE);
    assert.equal(
      await readFile(path.join(workspaceRoot, ".npmrc"), "utf8"),
      "include=dev\n"
    );

    const mapJson = await readJson(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`
    );
    assert.equal(mapJson.accepted, true);
    assert.equal(mapJson.materialized, true);
    assert.equal(mapJson.materializationState, "materialized");
    assert.equal(mapJson.reviewState, "materialized");
    assert.deepEqual(mapJson.openQuestions, []);

    const foundation = mapJson.projectFoundation as Record<string, unknown>;
    assert.equal(foundation.installCommand, "npm install --include=dev");
    assert.deepEqual(foundation.requiredScripts, [
      "build",
      "typecheck",
      "test:smoke",
    ]);
    assert.ok(
      Array.isArray(foundation.configFiles) &&
        foundation.configFiles.includes(".npmrc") &&
        foundation.configFiles.includes("package-lock.json") &&
        foundation.configFiles.includes("tsconfig.json") &&
        foundation.configFiles.includes("tsconfig.base.json")
    );
    assert.ok(result.materializedPaths.includes(".npmrc"));
    assert.ok(result.materializedPaths.includes("package-lock.json"));
    assert.ok(result.materializedPaths.includes("tsconfig.json"));
    assert.ok(!result.materializedPaths.includes("node_modules"));

    const markdown = await readFile(
      path.join(
        workspaceRoot,
        `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`
      ),
      "utf8"
    );
    assert.match(markdown, MARKDOWN_TITLE_RE);
    assert.match(markdown, CORE_MATERIALIZER_RE);
    assert.match(markdown, MATERIALIZED_STATE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Core materializer honors polyglot contract config files and entrypoints", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const stageDir = path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "application_skeleton"
    );
    await mkdir(stageDir, { recursive: true });
    await writeFile(
      path.join(stageDir, "application-skeleton-map.json"),
      `${JSON.stringify(
        {
          accepted: false,
          materializationState: "not_started",
          materialized: false,
          packageManager: "npm",
          productParts: [
            {
              codePath: "product-parts/engine",
              id: "engine",
            },
            {
              codePath: "product-parts/web-surface",
              id: "web-surface",
            },
            {
              codePath: "product-parts/terminal-surface",
              id: "terminal-surface",
            },
          ],
          projectFoundation: {
            configFiles: [
              ".gitignore",
              ".npmrc",
              "package-lock.json",
              "package.json",
              "tsconfig.base.json",
              "tsconfig.json",
              "product-parts/engine/pyproject.toml",
              "product-parts/web-surface/package.json",
              "product-parts/web-surface/tsconfig.json",
              "product-parts/terminal-surface/go.mod",
            ],
            firstWaveEntrypoints: [
              "product-parts/engine/src/main.py",
              "product-parts/web-surface/src/main.tsx",
              "product-parts/terminal-surface/cmd/terminal-surface/main.go",
            ],
            installCommand: "npm install --include=dev",
            requiredScripts: ["build", "typecheck", "test:smoke"],
          },
          reviewState: "draft",
          schema: "codeai-application-skeleton-v1",
          sourceRoot: "product-parts",
          stack: {
            frameworks: ["FastAPI", "React", "Bubble Tea"],
            languages: ["Python", "TypeScript", "Go"],
            runtimes: ["Python 3.13", "Node.js", "Go 1.24"],
          },
          workspaceRoot: ".",
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await new ApplicationSkeletonCoreMaterializer().materialize({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    for (const relativePath of [
      "product-parts/engine/pyproject.toml",
      "product-parts/engine/src/main.py",
      "product-parts/web-surface/package.json",
      "product-parts/web-surface/tsconfig.json",
      "product-parts/web-surface/src/index.ts",
      "product-parts/web-surface/src/main.tsx",
      "product-parts/terminal-surface/go.mod",
      "product-parts/terminal-surface/cmd/terminal-surface/main.go",
    ]) {
      await assertPathExists(workspaceRoot, relativePath);
      assert.ok(result.materializedPaths.includes(relativePath));
    }

    await assertPathMissing(workspaceRoot, "product-parts/engine/package.json");
    await assertPathMissing(
      workspaceRoot,
      "product-parts/engine/tsconfig.json"
    );
    await assertPathMissing(
      workspaceRoot,
      "product-parts/terminal-surface/package.json"
    );
    await assertPathMissing(
      workspaceRoot,
      "product-parts/terminal-surface/tsconfig.json"
    );

    assert.match(
      await readFile(
        path.join(workspaceRoot, "product-parts/engine/src/main.py"),
        "utf8"
      ),
      PYTHON_MAIN_MODULE_RE
    );
    assert.match(
      await readFile(
        path.join(
          workspaceRoot,
          "product-parts/terminal-surface/cmd/terminal-surface/main.go"
        ),
        "utf8"
      ),
      GO_MAIN_PACKAGE_RE
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "product-parts/web-surface/src/index.ts"),
        "utf8"
      ),
      TYPESCRIPT_ENTRYPOINT_RE
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "product-parts/web-surface/tsconfig.json"),
        "utf8"
      ),
      TSX_CLUSTER_INCLUDE_RE
    );

    const rootPackage = await readJson(workspaceRoot, "package.json");
    assert.deepEqual(rootPackage.workspaces, ["product-parts/web-surface"]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
