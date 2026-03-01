import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildVirtualSimulationContract } from "./idea-contract-service";

const makePromptPath = (homePath: string): string =>
  path.join(
    homePath,
    ".codeai-hub",
    "templates",
    "virtual_simulation",
    "virtual-simulation-prompt.md"
  );

test("virtual simulation contract is prompt-only (no artifact template path)", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-vs-contract-"));
  try {
    process.env.HOME = tempHome;

    const promptPath = makePromptPath(tempHome);
    await mkdir(path.dirname(promptPath), { recursive: true });
    await writeFile(
      promptPath,
      "# Virtual Simulation Agent Instructions\n",
      "utf8"
    );

    const contract = await buildVirtualSimulationContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, undefined);
    assert.equal(contract?.template, "");
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});
