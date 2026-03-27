import { promises as fs } from "node:fs";
import { platform } from "node:os";
import { ensureMacShortcut as ensureMacShortcutService } from "./mac-shortcut-service";

interface ShortcutTarget {
  readonly args: readonly string[];
  readonly path: string;
}

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const ensureMacShortcut = async (
  target: ShortcutTarget,
  shortcutName: string,
  bundleIdentifier: string
): Promise<void> => {
  await ensureMacShortcutService(target, shortcutName, bundleIdentifier);
};

export const ensureProjectManagerShortcuts = async (
  target?: ShortcutTarget
): Promise<void> => {
  if (!target) {
    return;
  }

  if (!(await pathExists(target.path))) {
    return;
  }

  try {
    if (platform() === "darwin") {
      await ensureMacShortcut(
        target,
        "CodeAI Hub Project Manager",
        "com.codeaihub.projectmanager"
      );
    }
  } catch {
    // Silently ignore failures
  }
};
