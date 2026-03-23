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

const countOccurrences = (source: string, needle: string): number =>
  source.split(needle).length - 1;

const countExactHeadingOccurrences = (
  source: string,
  heading: string
): number => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedHeading}$`, "gm").exec(source) === null
    ? 0
    : [...source.matchAll(new RegExp(`^${escapedHeading}$`, "gm"))].length;
};

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
    await writeBundledTemplate(tempHome, "product-parts-index-template");
    await writeBundledTemplate(tempHome, "product-part-template");
    await writeBundledTemplate(tempHome, "module-inventory-field-reference");
    await writeBundledTemplate(tempHome, "module-inventory-merge-rules");

    const contract = await buildDiagramModulesContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, undefined);
    assert.equal(contract?.prompt.includes("formal subsystem container"), true);
    assert.equal(contract?.prompt.includes("secondary classification"), true);
    assert.equal(contract?.prompt.includes("module-map.flow.json"), true);
    assert.equal(
      contract?.prompt.includes(
        "do not search for alternative template files on disk"
      ),
      true
    );
    assert.equal(
      contract?.prompt.includes(
        "Do not silently convert standalone modules into cluster members"
      ),
      true
    );
    assert.equal(
      countExactHeadingOccurrences(
        contract?.prompt ?? "",
        "# Product Parts Index"
      ),
      1
    );
    assert.equal(
      contract?.prompt.includes(
        "This staged file should materialize exactly one Product Part"
      ),
      true
    );
    assert.equal(
      countOccurrences(
        contract?.prompt ?? "",
        "# Module Inventory Field Reference"
      ),
      1
    );
    assert.equal(
      countOccurrences(
        contract?.prompt ?? "",
        "# Module Inventory Merge Rules"
      ),
      1
    );
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

test("diagram facades contract embeds field reference and merge rules into prompt", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-df-contract-"));
  try {
    process.env.HOME = tempHome;
    const promptPath = await writeBundledTemplate(
      tempHome,
      "facade-map-prompt"
    );
    await writeBundledTemplate(tempHome, "facade-map-template");
    await writeBundledTemplate(tempHome, "facade-map-field-reference");
    await writeBundledTemplate(tempHome, "facade-map-merge-rules");

    const contract = await buildDiagramFacadesContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, undefined);
    assert.equal(contract?.prompt.includes("`Kind`: сейчас `class`."), true);
    assert.equal(
      contract?.prompt.includes(
        "Держите facade ownership согласованным с текущим `module-inventory.md`"
      ),
      true
    );
    assert.equal(
      contract?.prompt.includes(
        "do not search for alternative template files on disk"
      ),
      true
    );
    assert.equal(
      countExactHeadingOccurrences(contract?.prompt ?? "", "# Facade Map"),
      1
    );
    assert.equal(
      countOccurrences(contract?.prompt ?? "", "# Facade Map Field Reference"),
      1
    );
    assert.equal(
      countOccurrences(contract?.prompt ?? "", "# Facade Map Merge Rules"),
      1
    );
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
