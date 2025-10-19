import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export class PlatformFileHandler {
  private readonly platform: NodeJS.Platform;
  private isMonitoring = false;

  constructor() {
    this.platform = process.platform;
  }

  startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return Promise.resolve();
    }
    this.isMonitoring = true;
    return Promise.resolve();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  getDraggedFiles(): Promise<string[] | null> {
    switch (this.platform) {
      case "darwin":
        return this.getMacOsSelectedFiles();
      case "win32":
        return this.getWindowsSelectedFiles();
      case "linux":
        return this.getLinuxSelectedFiles();
      default:
        return Promise.resolve(null);
    }
  }

  getPlatform(): string {
    return this.platform;
  }

  isPlatformSupported(): boolean {
    return ["darwin", "win32", "linux"].includes(this.platform);
  }

  private async getMacOsSelectedFiles(): Promise<string[] | null> {
    const script = `
      tell application "Finder"
        try
          set selectedFiles to selection
          if selectedFiles is not {} then
            set pathList to {}
            repeat with aFile in selectedFiles
              set end of pathList to POSIX path of (aFile as alias)
            end repeat
            set AppleScript's text item delimiters to linefeed
            return pathList as string
          end if
        on error
          return ""
        end try
      end tell
    `;

    try {
      const escapedScript = script.replace(/'/g, "'\"'\"'");
      const { stdout } = await execAsync(`osascript -e '${escapedScript}'`);
      const paths = stdout
        .trim()
        .split("\n")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return paths.length > 0 ? paths : null;
    } catch {
      return null;
    }
  }

  private async getWindowsSelectedFiles(): Promise<string[] | null> {
    const script = `
      $shell = New-Object -ComObject Shell.Application
      $windows = $shell.Windows()
      $paths = @()
      foreach ($window in $windows) {
        if ($window.Name -eq "File Explorer") {
          $items = $window.Document.SelectedItems()
          foreach ($item in $items) {
            $paths += $item.Path
          }
        }
      }
      $paths -join "\\n"
    `;

    try {
      const { stdout } = await execAsync(`powershell -Command "${script}"`);
      const paths = stdout
        .trim()
        .split("\n")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return paths.length > 0 ? paths : null;
    } catch {
      return null;
    }
  }

  private async getLinuxSelectedFiles(): Promise<string[] | null> {
    try {
      const { stdout } = await execAsync(
        "xclip -selection clipboard -o -t text/uri-list"
      );
      const paths = stdout
        .trim()
        .split("\n")
        .filter((line) => line.startsWith("file://"))
        .map((line) => decodeURIComponent(line.replace("file://", "")));
      if (paths.length > 0) {
        return paths;
      }
    } catch {
      // Intentionally ignored.
    }

    try {
      const { stdout } = await execAsync("xclip -selection primary -o");
      const text = stdout.trim();
      if (text.startsWith("/") || text.startsWith("~")) {
        return [text];
      }
    } catch {
      // Primary selection not available.
    }

    return null;
  }
}
