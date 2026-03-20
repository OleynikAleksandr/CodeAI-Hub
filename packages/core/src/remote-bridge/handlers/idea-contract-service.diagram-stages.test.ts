import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
import {
  buildDiagramFacadesContract,
  buildDiagramModulesContract,
} from "./idea-contract-service";

const writeBundledTemplate = async (
  homePath: string,
  templateId: string
): Promise<string> => {
  const bundled = BUNDLED_TEMPLATE_SOURCES.find(
    (entry) => entry.id === templateId
  );
  if (!bundled) {
    throw new Error(`Missing bundled template: ${templateId}`);
  }
  const targetPath = path.join(homePath, bundled.destinationRelativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(
    targetPath,
    Buffer.from(bundled.base64, "base64").toString("utf8"),
    "utf8"
  );
  return targetPath;
};

test("diagram modules contract embeds polygon grammar and inventory invariants", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-dm-contract-"));
  try {
    process.env.HOME = tempHome;
    const promptPath = await writeBundledTemplate(
      tempHome,
      "module-inventory-prompt"
    );
    const templatePath = await writeBundledTemplate(
      tempHome,
      "module-inventory-template"
    );
    await writeBundledTemplate(tempHome, "module-inventory-field-reference");
    await writeBundledTemplate(tempHome, "module-inventory-merge-rules");

    const contract = await buildDiagramModulesContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, templatePath);
    assert.equal(contract?.prompt.includes("formal subsystem container"), true);
    assert.equal(contract?.prompt.includes("secondary classification"), true);
    assert.equal(
      contract?.prompt.includes(
        "Do not silently convert standalone modules into cluster members"
      ),
      true
    );
    assert.equal(
      contract?.template.includes("### Cluster: example-user-workspace"),
      true
    );
    assert.equal(
      contract?.template.includes("#### Module: workspace-intake"),
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

test("diagram facades contract embeds field reference and merge rules into prompt", async () => {
  const contract = await buildDiagramFacadesContract();

  assert.notEqual(contract, null);
  assert.equal(contract?.paths.prompt.endsWith("facade-map-prompt.md"), true);
  assert.equal(
    contract?.paths.template?.endsWith("facade-map-template.md"),
    true
  );
  assert.equal(contract?.prompt.includes("Kind`: currently `class`."), true);
  assert.equal(
    contract?.prompt.includes(
      "Keep facade ownership aligned with the current `module-inventory.md`"
    ),
    true
  );
});
