import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { UIRegistry } from "../extension-module/ui/ui-registry";
import type { UIRegistryEntry } from "../extension-module/ui/ui-types";

const UNSUPPORTED_SCHEMA_REGEX = /Unsupported registry schema/;

describe("UIRegistry", () => {
	let tempDir: string;
	let registryPath: string;

	before(async () => {
		tempDir = (await mkdir(join(tmpdir(), "codeai-hub-registry-test-"), {
			recursive: true,
		})) as string;
		registryPath = join(tempDir, "registry.json");
	});

	after(async () => {
		if (tempDir) {
			await rm(tempDir, { recursive: true, force: true });
		}
	});

	it("should load default state if file does not exist", async () => {
		const registry = new UIRegistry(registryPath);
		const state = await registry.load();

		strictEqual(state.schema, 1);
		deepStrictEqual(state.installed, {});
	});

	it("should load existing registry from disk", async () => {
		const initialData = {
			schema: 1,
			installed: {
				"vscode-webview": {
					bundleId: "vscode-webview",
					version: "1.0.0",
					installedAt: 1_234_567_890,
					path: "/tmp/path",
				},
			},
		};
		await writeFile(registryPath, JSON.stringify(initialData));

		const registry = new UIRegistry(registryPath);
		const state = await registry.load();

		deepStrictEqual(state, initialData);
	});

	it("should throw error on invalid JSON", async () => {
		await writeFile(registryPath, "invalid json");
		const registry = new UIRegistry(registryPath);

		await rejects(async () => await registry.load(), UNSUPPORTED_SCHEMA_REGEX);
	});

	it("should throw error on unsupported schema", async () => {
		const invalidData = { schema: 2, installed: {} };
		await writeFile(registryPath, JSON.stringify(invalidData));
		const registry = new UIRegistry(registryPath);

		await rejects(async () => await registry.load(), UNSUPPORTED_SCHEMA_REGEX);
	});

	it("should register a bundle and persist to disk", async () => {
		// Reset file
		await rm(registryPath, { force: true });

		const registry = new UIRegistry(registryPath);
		await registry.load();

		const entry: UIRegistryEntry = {
			bundleId: "web-client",
			version: "2.0.0",
			installedAt: Date.now(),
			path: "/tmp/web-client",
		};

		await registry.registerBundle(entry);

		// Verify in memory
		const inMemory = registry.getBundle("web-client");
		deepStrictEqual(inMemory, entry);

		// Verify on disk
		const content = await readFile(registryPath, "utf-8");
		const diskState = JSON.parse(content);
		deepStrictEqual(diskState.installed["web-client"], entry);
	});

	it("should unregister a bundle and persist to disk", async () => {
		const registry = new UIRegistry(registryPath);
		await registry.load();

		// Ensure it exists first (from previous test)
		strictEqual(registry.getBundle("web-client") !== undefined, true);

		await registry.unregisterBundle("web-client");

		// Verify in memory
		strictEqual(registry.getBundle("web-client"), undefined);

		// Verify on disk
		const content = await readFile(registryPath, "utf-8");
		const diskState = JSON.parse(content);
		strictEqual(diskState.installed["web-client"], undefined);
	});

	it("should list all installed bundles", async () => {
		const registry = new UIRegistry(registryPath);
		// Clear and add two bundles
		await rm(registryPath, { force: true });
		await registry.load();

		const entry1: UIRegistryEntry = {
			bundleId: "vscode-webview",
			version: "1.0.0",
			installedAt: 1,
			path: "/p1",
		};
		const entry2: UIRegistryEntry = {
			bundleId: "web-client",
			version: "2.0.0",
			installedAt: 2,
			path: "/p2",
		};

		await registry.registerBundle(entry1);
		await registry.registerBundle(entry2);

		const list = registry.listBundles();
		strictEqual(list.length, 2);
		// Order is not guaranteed by Object.values, but usually insertion order for string keys in recent JS engines
		// Let's just check existence
		const hasEntry1 = list.some((e) => e.bundleId === "vscode-webview");
		const hasEntry2 = list.some((e) => e.bundleId === "web-client");
		strictEqual(hasEntry1, true);
		strictEqual(hasEntry2, true);
	});
});
