import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { ensureDirectory } from "../cef/runtime-files";

const EXECUTABLE_MODE = 0o755;

export type ShortcutTarget = {
  path: string;
  args: readonly string[];
};

const formatArgsForPosix = (args: readonly string[]): string =>
  args.map((arg) => `"${arg}"`).join(" ");

export const ensureMacShortcut = async (
  target: ShortcutTarget,
  shortcutName: string,
  bundleIdentifier: string
): Promise<void> => {
  const desktopDir = path.join(homedir(), "Desktop");
  const legacyCommand = path.join(desktopDir, `${shortcutName}.command`);
  const legacyWebloc = path.join(desktopDir, `${shortcutName}.webloc`);
  const appDir = path.join(desktopDir, `${shortcutName}.app`);
  const contentsDir = path.join(appDir, "Contents");
  const macOsDir = path.join(contentsDir, "MacOS");
  const frameworksDir = path.join(contentsDir, "Frameworks");
  const resourcesDir = path.join(contentsDir, "Resources");

  // Clean up legacy shortcuts
  await fs.rm(legacyCommand, { force: true }).catch(() => {
    /* no-op */
  });
  await fs.rm(legacyWebloc, { force: true }).catch(() => {
    /* no-op */
  });
  await fs.rm(appDir, { recursive: true, force: true }).catch(() => {
    /* no-op */
  });

  await ensureDirectory(macOsDir);

  // Identify original bundle paths
  const originalBinaryPath = target.path;
  const originalMacOsDir = path.dirname(originalBinaryPath);
  const originalContentsDir = path.dirname(originalMacOsDir);
  const originalFrameworksDir = path.join(originalContentsDir, "Frameworks");
  const originalResourcesDir = path.join(originalContentsDir, "Resources");

  // Create symlinks for heavy resources (Thin Bundle strategy)
  try {
    await fs.symlink(originalFrameworksDir, frameworksDir);
    await fs.symlink(originalResourcesDir, resourcesDir);
  } catch (_e) {
    // If symlinking fails (e.g. original doesn't have Frameworks?), log/ignore
  }

  // Copy the binary (Binary Copy strategy)
  const binaryName = path.basename(originalBinaryPath);
  const newBinaryPath = path.join(macOsDir, binaryName);
  await fs.copyFile(originalBinaryPath, newBinaryPath);
  await fs.chmod(newBinaryPath, EXECUTABLE_MODE);

  // Create Info.plist with unique Bundle ID
  const infoPlist = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "  <dict>",
    "    <key>CFBundleExecutable</key>",
    "    <string>launch</string>",
    "    <key>CFBundleIdentifier</key>",
    `    <string>${bundleIdentifier}</string>`,
    "    <key>CFBundleName</key>",
    `    <string>${shortcutName}</string>`,
    "    <key>CFBundlePackageType</key>",
    "    <string>APPL</string>",
    "    <key>CFBundleIconFile</key>",
    "    <string>app.icns</string>",
    "    <key>LSUIElement</key>",
    "    <false/>",
    "  </dict>",
    "</plist>",
  ].join("\n");

  await fs.writeFile(path.join(contentsDir, "Info.plist"), infoPlist, {
    encoding: "utf8",
  });

  // Create wrapper script
  const launchScriptPath = path.join(macOsDir, "launch");
  const args = formatArgsForPosix(target.args);

  // Wrapper script executes the COPIED binary within the same directory
  const launchScript = `#!/bin/bash\nexec "$(dirname "$0")/${binaryName}" ${args}\n`;

  await fs.writeFile(launchScriptPath, launchScript, { encoding: "utf8" });
  await fs.chmod(launchScriptPath, EXECUTABLE_MODE);
};
