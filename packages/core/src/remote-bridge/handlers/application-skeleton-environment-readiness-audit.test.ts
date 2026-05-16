import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditApplicationSkeletonEnvironmentReadiness } from "./application-skeleton-environment-readiness-audit";

const MISSING_INSTALL_OUTPUT_RE = /install output is missing: node_modules/;
const FAILED_SCRIPT_RE = /required script failed: build/;

const makeWorkspace = async (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "codeai-skeleton-env-audit-"));

const runNpm = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> =>
  new Promise((resolve, reject) => {
    execFile("npm", [...args], { cwd: workspaceRoot }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const writePackageJson = async (
  workspaceRoot: string,
  scripts: Record<string, string>
): Promise<void> => {
  const dependencyRoot = path.join(workspaceRoot, "local-dependency");
  await mkdir(dependencyRoot, { recursive: true });
  await writeFile(
    path.join(dependencyRoot, "package.json"),
    JSON.stringify({ name: "local-dependency", version: "0.0.0" })
  );
  await writeFile(
    path.join(workspaceRoot, "package.json"),
    JSON.stringify({
      dependencies: { "local-dependency": "file:local-dependency" },
      name: "skeleton-env-audit",
      private: true,
      scripts,
      version: "0.0.0",
    })
  );
  await runNpm(workspaceRoot, ["install", "--package-lock-only"]);
};

const makeMap = (
  requiredScripts: readonly string[] = ["build"]
): Record<string, unknown> => ({
  packageManager: "npm",
  projectFoundation: {
    installCommand: "npm ci",
    requiredScripts,
  },
});

test("environment readiness audit rejects missing install output", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const errors = await auditApplicationSkeletonEnvironmentReadiness({
      mapJson: {
        packageManager: "npm",
        projectFoundation: {
          installCommand: "true",
          requiredScripts: [],
        },
      },
      workspaceRoot,
    });

    assert.match(errors.join("\n"), MISSING_INSTALL_OUTPUT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("environment readiness audit rejects failed required scripts", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    await writePackageJson(workspaceRoot, {
      build: 'node -e "process.exit(3)"',
    });

    const errors = await auditApplicationSkeletonEnvironmentReadiness({
      mapJson: makeMap(),
      workspaceRoot,
    });

    assert.match(errors.join("\n"), FAILED_SCRIPT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("environment readiness audit accepts clean install and passing scripts", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    await writePackageJson(workspaceRoot, {
      build: 'node -e "process.exit(0)"',
      "test:smoke": 'node -e "process.exit(0)"',
      typecheck: 'node -e "process.exit(0)"',
    });

    const errors = await auditApplicationSkeletonEnvironmentReadiness({
      mapJson: makeMap(["build", "typecheck", "test:smoke"]),
      workspaceRoot,
    });

    assert.deepEqual(errors, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
