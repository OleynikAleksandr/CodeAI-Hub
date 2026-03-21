import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
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
    const bundledPrompt = BUNDLED_TEMPLATE_SOURCES.find(
      (entry) => entry.id === "virtual-simulation-prompt"
    );
    if (!bundledPrompt) {
      throw new Error("Bundled virtual simulation prompt is missing");
    }
    await writeFile(
      promptPath,
      Buffer.from(bundledPrompt.base64, "base64").toString("utf8"),
      "utf8"
    );

    const contract = await buildVirtualSimulationContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, undefined);
    assert.equal(contract?.template, "");
    assert.equal(
      contract?.prompt.includes("Archetype / shell constraints"),
      true
    );
    assert.equal(
      contract?.prompt.includes("Candidate clusters and standalone modules"),
      true
    );
    assert.equal(
      contract?.prompt.includes("Boundary-sensitive interactions"),
      true
    );
    assert.equal(
      contract?.prompt.includes(
        "Сценарии из анкеты и `Final_Description.md` — это только начальная база"
      ),
      true
    );
    assert.equal(
      contract?.prompt.includes("достаточное количество ключевых сценариев"),
      true
    );
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});
