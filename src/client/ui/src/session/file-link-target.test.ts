import assert from "node:assert/strict";
import test from "node:test";
import { resolveFileLinkTarget } from "./file-link-target";

test("resolveFileLinkTarget parses unix absolute paths with line and column", () => {
  const target = resolveFileLinkTarget(
    "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md:28:3"
  );

  assert.deepEqual(target, {
    href: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md:28:3",
    filePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md",
    line: 28,
    column: 3,
  });
});

test("resolveFileLinkTarget decodes percent-encoded unix absolute paths", () => {
  const target = resolveFileLinkTarget(
    "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub%20codex%205.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md:28:3"
  );

  assert.deepEqual(target, {
    href: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub%20codex%205.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md:28:3",
    filePath:
      "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md",
    line: 28,
    column: 3,
  });
});

test("resolveFileLinkTarget parses file URI hash locations", () => {
  const target = resolveFileLinkTarget(
    "file:///Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md#L12C4"
  );

  assert.deepEqual(target, {
    href: "file:///Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md#L12C4",
    filePath: "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/README.md",
    line: 12,
    column: 4,
  });
});

test("resolveFileLinkTarget keeps windows absolute paths distinct from line suffix", () => {
  const target = resolveFileLinkTarget("C:\\Work\\virtual-simulation.md:9:2");

  assert.deepEqual(target, {
    href: "C:\\Work\\virtual-simulation.md:9:2",
    filePath: "C:\\Work\\virtual-simulation.md",
    line: 9,
    column: 2,
  });
});

test("resolveFileLinkTarget ignores non-file hrefs", () => {
  assert.equal(
    resolveFileLinkTarget("https://example.com/virtual-simulation.md"),
    null
  );
});
