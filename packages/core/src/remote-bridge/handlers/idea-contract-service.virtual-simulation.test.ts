import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
import {
  buildDescriptionContract,
  buildVirtualSimulationContract,
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
    assert.equal(
      contract?.prompt.includes("не ради искусственного числового лимита"),
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

test("description contract restores missing template from bundled assets", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(
    path.join(tmpdir(), "codeai-description-contract-")
  );
  try {
    process.env.HOME = tempHome;

    const promptPath = await writeBundledTemplate(
      tempHome,
      "description-collector-prompt"
    );
    const questionnairePath = await writeBundledTemplate(
      tempHome,
      "description-questionnaire-template"
    );
    const restoredTemplatePath = path.join(
      tempHome,
      ".codeai-hub",
      "templates",
      "description",
      "description-template.md"
    );

    const contract = await buildDescriptionContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, restoredTemplatePath);
    assert.equal(contract?.paths.questionnaire, questionnairePath);
    assert.equal(
      contract?.template.includes(
        "ключевые сценарии использования без жёсткого лимита"
      ),
      true
    );
    assert.equal(
      contract?.template.includes(
        "отдельный блок ключевых пользовательских сценариев"
      ),
      true
    );
    await assert.doesNotReject(access(restoredTemplatePath));
    const restoredTemplate = await readFile(restoredTemplatePath, "utf8");
    assert.equal(
      restoredTemplate.includes(
        "После этого продолжайте диалог, пока документ вас устраивает"
      ),
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
