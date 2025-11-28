import { deepStrictEqual, rejects } from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { readUIManifest } from "../extension-module/ui/ui-manifest-reader";

const UNSUPPORTED_SCHEMA_REGEX = /Unsupported UI manifest schema/;
const MISSING_BUNDLES_REGEX = /Invalid UI manifest: missing 'bundles' object/;

describe("UIManifestReader", () => {
	let tempDir: string;

	before(async () => {
		tempDir = (await mkdir(join(tmpdir(), "codeai-hub-test-"), {
			recursive: true,
		})) as string;
	});

	after(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("should successfully read a valid manifest", async () => {
		const validManifest = {
			schema: 1,
			baseUrl: "file:///tmp/",
			bundles: {
				"vscode-webview": {
					version: "1.0.0",
					package: "ui.tar.bz2",
					size: 1024,
					sha1: "abc",
				},
			},
		};
		const manifestPath = join(tempDir, "valid-manifest.json");
		await writeFile(manifestPath, JSON.stringify(validManifest));

		const result = await readUIManifest(manifestPath);
		deepStrictEqual(result, validManifest);
	});

	it("should throw error on invalid JSON", async () => {
		const manifestPath = join(tempDir, "invalid.json");
		await writeFile(manifestPath, "invalid json");

		await rejects(async () => await readUIManifest(manifestPath), SyntaxError);
	});

	it("should throw error on unsupported schema version", async () => {
		const invalidSchema = {
			schema: 2,
			bundles: {},
		};
		const manifestPath = join(tempDir, "invalid-schema.json");
		await writeFile(manifestPath, JSON.stringify(invalidSchema));

		await rejects(
			async () => await readUIManifest(manifestPath),
			UNSUPPORTED_SCHEMA_REGEX,
		);
	});

	it("should throw error on missing bundles object", async () => {
		const missingBundles = {
			schema: 1,
		};
		const manifestPath = join(tempDir, "missing-bundles.json");
		await writeFile(manifestPath, JSON.stringify(missingBundles));

		await rejects(
			async () => await readUIManifest(manifestPath),
			MISSING_BUNDLES_REGEX,
		);
	});
});
