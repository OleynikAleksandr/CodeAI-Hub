#!/usr/bin/env node

const { build } = require("esbuild");
const fs = require("node:fs/promises");
const path = require("node:path");

const projectRoot = path.resolve(
  path.dirname(require.resolve("./build-project-manager.js")),
  ".."
);
const entryFile = path.join(
  projectRoot,
  "src",
  "client",
  "project-manager",
  "index.tsx"
);
const distDir = path.join(
  projectRoot,
  "packages",
  "ui",
  "project-manager",
  "dist"
);
const sourceHtml = path.join(
  projectRoot,
  "packages",
  "ui",
  "project-manager",
  "index.html"
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

    // Inject styles from canonical sources:
    // 1) Project Manager base theme
    // 2) Shared Session UI stylesheet
    const projectManagerStylesPath = path.join(
      projectRoot,
      "packages",
      "ui",
      "project-manager",
      "styles.css"
    );
    const sessionStylesPath = path.join(
      projectRoot,
      "media",
      "session-view.css"
    );
    const reactFlowStylesPath = path.join(
      projectRoot,
      "node_modules",
      "@xyflow",
      "react",
      "dist",
      "style.css"
    );
    let projectManagerCss = "";
    let sessionCss = "";
    let reactFlowCss = "";
    try {
      projectManagerCss = await fs.readFile(projectManagerStylesPath, "utf8");
    } catch (_e) {
      console.warn("No styles.css found, skipping injection");
    }
    try {
      sessionCss = await fs.readFile(sessionStylesPath, "utf8");
    } catch (_e) {
      console.warn(
        "No session-view.css found, skipping session style injection"
      );
    }
    try {
      reactFlowCss = await fs.readFile(reactFlowStylesPath, "utf8");
    } catch (_e) {
      console.warn("No React Flow stylesheet found, skipping injection");
    }

    const themeBlock = [
      `<style id="codeai-hub-theme">\n${projectManagerCss}\n</style>`,
      `<style id="codeai-hub-session-theme">\n${sessionCss}\n</style>`,
      `<style id="codeai-hub-react-flow-theme">\n${reactFlowCss}\n</style>`,
    ].join("\n");
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
