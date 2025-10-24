import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir, platform } from "node:os";
import path from "node:path";

const SHORTCUT_NAME = "CodeAI Hub Web Client";
const EXECUTABLE_MODE = 0o755;

const ensureDirectory = async (directory: string) => {
  await fs.mkdir(directory, { recursive: true });
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const runPowerShell = (command: string): Promise<void> =>
  new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-WindowStyle", "Hidden", "-Command", command],
      (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      }
    );
  });

type ShortcutTarget = {
  readonly path: string;
  readonly args: readonly string[];
};

const formatArgsForWindows = (args: readonly string[]): string =>
  args.map((arg) => `"${arg.replace(/"/g, '""')}"`).join(" ");

const ensureWindowsShortcut = async (target: ShortcutTarget): Promise<void> => {
  const desktopDir = path.join(homedir(), "Desktop");
  const shortcutPath = path.join(desktopDir, `${SHORTCUT_NAME}.lnk`);

  if (await pathExists(shortcutPath)) {
    await fs.rm(shortcutPath, { force: true }).catch(() => {
      /* ignore */
    });
  }

  await ensureDirectory(desktopDir);

  const sanitizedTarget = target.path.replace(/'/g, "''");
  const sanitizedShortcut = shortcutPath.replace(/'/g, "''");
  const sanitizedWorkingDir = path.dirname(target.path).replace(/'/g, "''");
  const argumentsString = formatArgsForWindows(target.args);
  const sanitizedArguments = argumentsString.replace(/'/g, "''");

  const script = [
    "$shell = New-Object -ComObject WScript.Shell",
    `$shortcut = $shell.CreateShortcut('${sanitizedShortcut}')`,
    `$shortcut.TargetPath = '${sanitizedTarget}'`,
    `$shortcut.WorkingDirectory = '${sanitizedWorkingDir}'`,
    target.args.length > 0
      ? `$shortcut.Arguments = '${sanitizedArguments}'`
      : "",
    "$shortcut.Save()",
  ]
    .filter(Boolean)
    .join("; ");

  await runPowerShell(script);
};

const formatArgsForPosix = (args: readonly string[]): string =>
  args
    .map((arg) => {
      const escaped = arg.replace(/"/g, '\\"');
      return `"${escaped}"`;
    })
    .join(" ");

const ensureMacShortcut = async (target: ShortcutTarget): Promise<void> => {
  const desktopDir = path.join(homedir(), "Desktop");
  const legacyCommand = path.join(desktopDir, `${SHORTCUT_NAME}.command`);
  const legacyWebloc = path.join(desktopDir, `${SHORTCUT_NAME}.webloc`);
  const appDir = path.join(desktopDir, `${SHORTCUT_NAME}.app`);
  const contentsDir = path.join(appDir, "Contents");
  const macOsDir = path.join(contentsDir, "MacOS");

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

  const infoPlist = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "  <dict>",
    "    <key>CFBundleExecutable</key>",
    "    <string>launch</string>",
    "    <key>CFBundleIdentifier</key>",
    "    <string>com.codeaihub.webclient</string>",
    "    <key>CFBundleName</key>",
    `    <string>${SHORTCUT_NAME}</string>`,
    "    <key>CFBundlePackageType</key>",
    "    <string>APPL</string>",
    "  </dict>",
    "</plist>",
  ].join("\n");

  await fs.writeFile(path.join(contentsDir, "Info.plist"), infoPlist, {
    encoding: "utf8",
  });

  const launchScriptPath = path.join(macOsDir, "launch");
  const args = formatArgsForPosix(target.args);
  const launchScript = `#!/bin/bash\n"${target.path}" ${args}\n`;
  await fs.writeFile(launchScriptPath, launchScript, { encoding: "utf8" });
  await fs.chmod(launchScriptPath, EXECUTABLE_MODE);
};

const ensureLinuxShortcut = async (target: ShortcutTarget): Promise<void> => {
  const applicationsDir = path.join(
    homedir(),
    ".local",
    "share",
    "applications"
  );
  const shortcutPath = path.join(
    applicationsDir,
    "codeai-hub-web-client.desktop"
  );

  if (await pathExists(shortcutPath)) {
    await fs.rm(shortcutPath, { force: true }).catch(() => {
      /* ignore */
    });
  }

  await ensureDirectory(applicationsDir);

  const args = formatArgsForPosix(target.args);
  const commandLine = [`"${target.path}"`, args].filter(Boolean).join(" ");
  const desktopEntry = [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${SHORTCUT_NAME}`,
    "Comment=Standalone web client for CodeAI Hub",
    `Exec=${commandLine}`,
    "Terminal=false",
    "Categories=Development;Utility;",
  ].join("\n");
  const content = `${desktopEntry}\n`;

  await fs.writeFile(shortcutPath, content, { encoding: "utf8" });
  await fs.chmod(shortcutPath, EXECUTABLE_MODE);
};

export const ensureWebClientShortcuts = async (
  target?: ShortcutTarget
): Promise<void> => {
  if (!target) {
    return;
  }

  if (!(await pathExists(target.path))) {
    return;
  }

  try {
    switch (platform()) {
      case "win32":
        await ensureWindowsShortcut(target);
        break;
      case "darwin":
        await ensureMacShortcut(target);
        break;
      case "linux":
        await ensureLinuxShortcut(target);
        break;
      default:
        break;
    }
  } catch {
    // Silently ignore failures to avoid interrupting activation flow.
  }
};
