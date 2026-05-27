import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { bootstrapGeminiProviderHomeFromLegacyAuth } from "./cli-bridge-provider-home";

const writeFixture = async (
  filePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("Gemini provider home bootstraps missing auth files from legacy Gemini home", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "gemini-provider-home-"));
  const legacyGeminiDir = path.join(tempDir, "legacy", ".gemini");
  const providerGeminiDir = path.join(
    tempDir,
    "workspace",
    ".codeai-hub",
    "workspace",
    "runtime",
    "providers",
    "gemini",
    "home",
    ".gemini"
  );

  try {
    await writeFixture(
      path.join(legacyGeminiDir, "oauth_creds.json"),
      '{"token":"legacy"}'
    );
    await writeFixture(
      path.join(legacyGeminiDir, "google_accounts.json"),
      '{"accounts":["user@example.com"]}'
    );
    await writeFixture(
      path.join(legacyGeminiDir, "settings.json"),
      '{"security":{"auth":{"selectedType":"login_with_google"}}}'
    );
    await writeFixture(
      path.join(legacyGeminiDir, "installation_id"),
      "legacy-installation"
    );

    const result = await bootstrapGeminiProviderHomeFromLegacyAuth({
      legacyGeminiDir,
      providerGeminiDir,
    });

    assert.equal(result.authAvailable, true);
    assert.deepEqual(result.copiedFiles.sort(), [
      "google_accounts.json",
      "installation_id",
      "oauth_creds.json",
      "settings.json",
    ]);
    assert.equal(
      await readFile(path.join(providerGeminiDir, "oauth_creds.json"), "utf8"),
      '{"token":"legacy"}'
    );
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
