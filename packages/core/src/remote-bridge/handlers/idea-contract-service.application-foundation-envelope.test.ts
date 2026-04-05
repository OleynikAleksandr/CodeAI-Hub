import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "../../templates/bundled-templates";
import { buildApplicationFoundationEnvelopeContract } from "./idea-contract-service";

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

test("application foundation envelope contract uses the bundled prompt asset", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-afe-contract-"));
  try {
    process.env.HOME = tempHome;
    const promptPath = await writeBundledTemplate(
      tempHome,
      "application-foundation-envelope-prompt"
    );

    const contract = await buildApplicationFoundationEnvelopeContract();

    assert.notEqual(contract, null);
    assert.equal(contract?.paths.prompt, promptPath);
    assert.equal(contract?.paths.template, undefined);
    assert.equal(contract?.promptAudience, "internal_agent_instructions");
    assert.equal(contract?.templateAudience, undefined);
    assert.equal(contract?.questionnaire, undefined);
    assert.equal(contract?.prompt.includes("Application Root"), true);
    assert.equal(
      contract?.prompt.includes("application-envelope.flow.json"),
      true
    );
    assert.equal(
      contract?.prompt.includes("Application Foundation Envelope"),
      true
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
