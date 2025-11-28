#!/usr/bin/env node

const { build } = require("esbuild");
const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const entryFile = path.join(
	projectRoot,
	"src",
	"client",
	"project-manager",
	"index.tsx",
);
const distDir = path.join(
	projectRoot,
	"packages",
	"ui",
	"project-manager",
	"dist",
);
const sourceHtml = path.join(
	projectRoot,
	"packages",
	"ui",
	"project-manager",
	"index.html",
);
const targetHtml = path.join(distDir, "index.html");

async function run() {
	try {
		// Clean dist
		await fs.rm(distDir, { recursive: true, force: true });
		await fs.mkdir(distDir, { recursive: true });

		// Build React App
		await build({
			entryPoints: [entryFile],
			outfile: path.join(distDir, "app.js"),
			bundle: true,
			platform: "browser",
			format: "iife",
			target: ["es2020"],
			loader: {
				".ts": "ts",
				".tsx": "tsx",
			},
			define: {
				"process.env.NODE_ENV": '"production"',
			},
			minify: false,
			sourcemap: false,
			jsx: "automatic",
			logLevel: "error",
		});

		// Process HTML
		const htmlTemplate = await fs.readFile(sourceHtml, "utf8");

		// Inject styles
		// We can reuse main-view.css and others if needed, or just project-manager specific styles.
		// For now, let's inject styles.css from the package.
		const stylesPath = path.join(
			projectRoot,
			"packages",
			"ui",
			"project-manager",
			"styles.css",
		);
		let css = "";
		try {
			css = await fs.readFile(stylesPath, "utf8");
		} catch (_e) {
			console.warn("No styles.css found, skipping injection");
		}

		const themeBlock = `<style id="codeai-hub-theme">\n${css}\n</style>`;
		let htmlOutput;
		if (htmlTemplate.includes("<!--theme:inject-->")) {
			htmlOutput = htmlTemplate.replace("<!--theme:inject-->", themeBlock);
		} else {
			htmlOutput = htmlTemplate.replace("</head>", `${themeBlock}\n</head>`);
		}

		// Also need to ensure script tag points to app.js if not already
		// But usually index.html should have <script src="app.js"></script>
		// Let's assume index.html is correct or we update it.
		// The scaffolded index.html (from previous steps) might need checking.

		await fs.writeFile(targetHtml, htmlOutput, "utf8");

		process.stdout.write("project manager bundle generated successfully\n");
	} catch (error) {
		process.stderr.write(`project manager build failed: ${error.message}\n`);
		process.exitCode = 1;
	}
}

run();
