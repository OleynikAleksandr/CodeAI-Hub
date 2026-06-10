import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectReachableScripts,
  evaluateGateCommandReachability,
} from "./quality-gates-command-reachability";
import {
  collectQualityGatesIntegrationConsistencyDiagnostics,
  collectQualityGatesVerificationEvidenceDiagnostics,
} from "./quality-gates-consistency-validator";
import { collectQualityGatesHookCommandDiagnostics } from "./quality-gates-formal-verification-runner";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writePackageJson = async (
  workspaceRoot: string,
  scripts: Record<string, string>
): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    `${JSON.stringify({ scripts }, null, 2)}\n`
  );

const buildContract = (params: {
  readonly beforeCommit: readonly { command?: string; id: string }[];
  readonly beforePush?: readonly { command?: string; id: string }[];
}): Record<string, unknown> => {
  const commands: Record<string, unknown> = {};
  for (const gate of [...params.beforeCommit, ...(params.beforePush ?? [])]) {
    commands[gate.id] = gate.command
      ? { id: gate.id, proposedCommand: gate.command }
      : { id: gate.id };
  }
  return {
    commands,
    requiredBeforeCommit: params.beforeCommit.map((gate) => gate.id),
    requiredBeforePush: (params.beforePush ?? []).map((gate) => gate.id),
  };
};

test("accepts agent-chosen script names when gate commands are reachable", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-hook-valid-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "check:types": "tsc -p tsconfig.json",
      "qg-secret-scan": "node scripts/quality-gates/secret-scan.mjs",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg-secret-scan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-push",
      "#!/bin/sh\nset -e\nnpm run --silent check:types\n"
    );

    const diagnostics = await collectQualityGatesHookCommandDiagnostics({
      contract: buildContract({
        beforeCommit: [
          { command: "npm run qg-secret-scan", id: "qg-secret-scan" },
        ],
        beforePush: [{ command: "npm run check:types", id: "typecheck" }],
      }),
      workspaceRoot,
    });

    assert.deepEqual(diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepts gate commands reached transitively through aggregate scripts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-hook-aggregate-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      lint: "biome check .",
      "qg:all": "npm run lint && npm run typecheck",
      typecheck: "tsc -p tsconfig.json",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:all\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");

    const diagnostics = await collectQualityGatesHookCommandDiagnostics({
      contract: buildContract({
        beforeCommit: [
          { command: "npm run lint", id: "lint" },
          { command: "npm run typecheck", id: "typecheck" },
        ],
      }),
      workspaceRoot,
    });

    assert.deepEqual(diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("reports entity diagnostics for missing, unresolved, and unreachable gate commands", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-hook-broken-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:ghost\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");

    const diagnostics = await collectQualityGatesHookCommandDiagnostics({
      contract: buildContract({
        beforeCommit: [
          { id: "no-command" },
          { command: "npm run ghost-script", id: "unresolved" },
          { command: "npm run qg:secret-scan", id: "secret-scan" },
        ],
      }),
      workspaceRoot,
    });

    assert.ok(
      diagnostics.includes(
        "missing_hook_package_script:.husky/pre-commit:qg:ghost"
      )
    );
    assert.ok(diagnostics.includes("gate_command_missing:no-command"));
    assert.ok(
      diagnostics.includes(
        "gate_command_unresolved:unresolved:npm run ghost-script"
      )
    );
    assert.ok(
      diagnostics.includes(
        "gate_command_not_reachable:secret-scan:npm run qg:secret-scan in .husky/pre-commit"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("verification accepts hook-run evidence without aggregate scripts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-verify-hook-run-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "check:types": "tsc -p tsconfig.json",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run check:types\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");
    const contractJson = {
      ...buildContract({
        beforeCommit: [{ command: "npm run check:types", id: "typecheck" }],
      }),
      verificationEvidence: {
        executionMode: "sequential",
        commands: [
          {
            command: "sh .husky/pre-commit",
            exitCode: 0,
            sequence: 1,
            status: "passed",
          },
        ],
      },
      verificationState: "verified",
    };

    const diagnostics =
      await collectQualityGatesVerificationEvidenceDiagnostics({
        contractJson,
        workspaceRoot,
      });

    assert.deepEqual(diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("verification rejects passed evidence without sequential execution metadata", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-verify-nonsequential-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "check:types": "tsc -p tsconfig.json",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run check:types\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");
    const contractJson = {
      ...buildContract({
        beforeCommit: [{ command: "npm run check:types", id: "typecheck" }],
      }),
      verificationEvidence: {
        commands: [
          { command: "sh .husky/pre-commit", exitCode: 0, status: "passed" },
        ],
      },
      verificationState: "verified",
    };

    const diagnostics =
      await collectQualityGatesVerificationEvidenceDiagnostics({
        contractJson,
        workspaceRoot,
      });

    assert.ok(diagnostics.includes("missing_sequential_verification_evidence"));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("verification names the hook run when no enforcement evidence passed", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-verify-missing-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "check:types": "tsc -p tsconfig.json",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run check:types\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");
    const contractJson = {
      ...buildContract({
        beforeCommit: [{ command: "npm run check:types", id: "typecheck" }],
      }),
      verificationEvidence: { commands: [], executionMode: "sequential" },
      verificationState: "verified",
    };

    const diagnostics =
      await collectQualityGatesVerificationEvidenceDiagnostics({
        contractJson,
        workspaceRoot,
      });

    assert.ok(
      diagnostics.includes(
        "missing_verification_command_evidence:sh .husky/pre-commit"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("planned gate runner evidence uses the contract command", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-planned-evidence-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "qg:all": "npm run sast",
      sast: "node scripts/quality-gates/sast.mjs",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:all\n"
    );
    await writeWorkspaceFile(workspaceRoot, ".husky/pre-push", "#!/bin/sh\n");
    const contractJson = {
      commands: {
        sast: { id: "sast", proposedCommand: "npm run sast" },
      },
      integratedPaths: ["package.json"],
      plannedRequiredAfterIntegration: ["sast"],
    };

    const diagnostics =
      await collectQualityGatesIntegrationConsistencyDiagnostics({
        contractJson,
        workspaceRoot,
      });

    assert.ok(
      diagnostics.includes(
        "planned_gate_has_runner_evidence_after_integration:sast:.husky/pre-commit"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("reaches non-npm gate commands through script bodies and survives script cycles", () => {
  const packageScripts = {
    "qg:all": "npm run qg:loop && node scripts/check-architecture.mjs",
    "qg:loop": "npm run qg:all",
  };
  const reachable = collectReachableScripts({
    packageScripts,
    text: "npm run qg:all",
  });
  assert.ok(reachable.has("qg:all"));
  assert.ok(reachable.has("qg:loop"));

  const viaBody = evaluateGateCommandReachability({
    command: "node scripts/check-architecture.mjs",
    hookText: "#!/bin/sh\nnpm run qg:all\n",
    packageScripts,
  });
  assert.equal(viaBody.reachableFromHook, true);
  assert.deepEqual(viaBody.unresolvedScripts, []);

  const literal = evaluateGateCommandReachability({
    command: "node scripts/check-architecture.mjs",
    hookText: "#!/bin/sh\nnode scripts/check-architecture.mjs\n",
    packageScripts: {},
  });
  assert.equal(literal.reachableFromHook, true);
});
