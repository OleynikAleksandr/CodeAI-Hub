import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { materializeCodexProviderHomeAuth } from "./codex-provider-home-auth";

const AUTH_FILENAME = "auth.json";

const sameFile = async (left: string, right: string): Promise<boolean> => {
  const [leftStats, rightStats] = await Promise.all([stat(left), stat(right)]);
  return leftStats.dev === rightStats.dev && leftStats.ino === rightStats.ino;
};

test("materializeCodexProviderHomeAuth replaces a stale copied auth file with shared auth", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codex-auth-"));
  try {
    const legacyCodexHome = path.join(workspaceRoot, "legacy");
    const providerCodexHome = path.join(workspaceRoot, "provider");
    const sourcePath = path.join(legacyCodexHome, AUTH_FILENAME);
    const destinationPath = path.join(providerCodexHome, AUTH_FILENAME);
    await mkdir(legacyCodexHome, { recursive: true });
    await mkdir(providerCodexHome, { recursive: true });
    await writeFile(sourcePath, '{"token":"fresh"}\n', "utf8");
    await writeFile(destinationPath, '{"token":"stale-copy"}\n', "utf8");

    const result = await materializeCodexProviderHomeAuth({
      authFilename: AUTH_FILENAME,
      legacyCodexHome,
      providerCodexHome,
    });

    assert.deepEqual(result, {
      destinationPath,
      linked: true,
      sourcePath,
    });
    assert.equal(
      await readFile(destinationPath, "utf8"),
      '{"token":"fresh"}\n'
    );
    assert.equal(await sameFile(sourcePath, destinationPath), true);

    await writeFile(sourcePath, '{"token":"rotated"}\n', "utf8");
    assert.equal(
      await readFile(destinationPath, "utf8"),
      '{"token":"rotated"}\n'
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("materializeCodexProviderHomeAuth keeps an existing shared auth link", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codex-auth-"));
  try {
    const legacyCodexHome = path.join(workspaceRoot, "legacy");
    const providerCodexHome = path.join(workspaceRoot, "provider");
    const sourcePath = path.join(legacyCodexHome, AUTH_FILENAME);
    const destinationPath = path.join(providerCodexHome, AUTH_FILENAME);
    await mkdir(legacyCodexHome, { recursive: true });
    await writeFile(sourcePath, '{"token":"fresh"}\n', "utf8");

    await materializeCodexProviderHomeAuth({
      authFilename: AUTH_FILENAME,
      legacyCodexHome,
      providerCodexHome,
    });
    const before = await lstat(destinationPath);

    await materializeCodexProviderHomeAuth({
      authFilename: AUTH_FILENAME,
      legacyCodexHome,
      providerCodexHome,
    });
    const after = await lstat(destinationPath);

    assert.equal(before.isSymbolicLink(), after.isSymbolicLink());
    assert.equal(await sameFile(sourcePath, destinationPath), true);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("materializeCodexProviderHomeAuth skips provider auth when legacy auth is absent", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "codex-auth-"));
  try {
    const providerCodexHome = path.join(workspaceRoot, "provider");

    const result = await materializeCodexProviderHomeAuth({
      authFilename: AUTH_FILENAME,
      legacyCodexHome: path.join(workspaceRoot, "missing"),
      providerCodexHome,
    });

    assert.equal(result, null);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
