import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const WINDOWS_PATH_PATTERN = /^[a-zA-Z]:[\\/]/;

const sanitizeOutput = (value: string): string =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join("\n");

const decodeFileUri = (entry: string): string => {
  if (!entry.startsWith("file://")) {
    return entry;
  }
  try {
    return decodeURIComponent(entry.replace("file://", ""));
  } catch {
    return entry.replace("file://", "");
  }
};

const isPathCandidate = (value: string): boolean =>
  value.startsWith("file://") ||
  value.startsWith("/") ||
  value.startsWith("~") ||
  value.startsWith("./") ||
  value.startsWith("../") ||
  WINDOWS_PATH_PATTERN.test(value);

export interface FileDropSnapshot {
  readonly formatted: string;
  readonly paths: readonly string[];
}

const CACHE_TTL_MS = 5000;

export class FileDropService {
  private cachedPaths: string[] = [];
  private lastCapture = 0;

  async collect(): Promise<FileDropSnapshot | null> {
    const cached = this.getCachedPaths();
    if (cached.length > 0) {
      return {
        paths: cached,
        formatted: this.formatPaths(cached),
      };
    }

    const detected = await this.detectPlatformSelection();
    if (detected.length > 0) {
      this.updateCache(detected);
      return {
        paths: detected,
        formatted: this.formatPaths(detected),
      };
    }

    const clipboardPath = await this.readClipboardPath();
    if (clipboardPath) {
      this.updateCache([clipboardPath]);
      return {
        paths: [clipboardPath],
        formatted: this.formatPaths([clipboardPath]),
      };
    }

    return null;
  }

  clear(): void {
    this.cachedPaths = [];
    this.lastCapture = 0;
  }

  private getCachedPaths(): string[] {
    if (this.cachedPaths.length === 0) {
      return [];
    }
    const age = Date.now() - this.lastCapture;
    if (age > CACHE_TTL_MS) {
      this.clear();
      return [];
    }
    return [...this.cachedPaths];
  }

  private updateCache(paths: readonly string[]): void {
    this.cachedPaths = [...paths];
    this.lastCapture = Date.now();
  }

  private formatPaths(paths: readonly string[]): string {
    if (paths.length === 0) {
      return "";
    }

    const quoted = paths.map((path) => `"${path}"`).join("\n");
    return `${quoted}\n`;
  }

  private detectPlatformSelection(): Promise<string[]> {
    switch (process.platform) {
      case "darwin":
        return this.getMacFinderSelection();
      case "win32":
        return this.getWindowsExplorerSelection();
      case "linux":
        return this.getLinuxFileSelection();
      default:
        return Promise.resolve([]);
    }
  }

  private async getMacFinderSelection(): Promise<string[]> {
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
      const escaped = script.replace(/'/g, "'\"'\"'");
      const { stdout } = await execAsync(`osascript -e '${escaped}'`);
      const sanitized = sanitizeOutput(stdout);
      if (!sanitized) {
        return [];
      }
      return sanitized.split("\n").map((entry) => decodeFileUri(entry));
    } catch {
      return [];
    }
  }

  private async getWindowsExplorerSelection(): Promise<string[]> {
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
      const escaped = script.replace(/"/g, '""');
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "${escaped}"`
      );
      const sanitized = sanitizeOutput(stdout);
      if (!sanitized) {
        return [];
      }
      return sanitized.split("\n");
    } catch {
      return [];
    }
  }

  private async getLinuxFileSelection(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        "xclip -selection clipboard -o -t text/uri-list"
      );
      const sanitized = sanitizeOutput(stdout);
      if (sanitized) {
        return sanitized
          .split("\n")
          .filter((entry) => entry.startsWith("file://"))
          .map((entry) => decodeFileUri(entry));
      }
    } catch {
      // clipboard selection may not be available
    }

    try {
      const { stdout } = await execAsync("xclip -selection primary -o");
      const candidate = sanitizeOutput(stdout);
      if (candidate && isPathCandidate(candidate)) {
        return [candidate];
      }
    } catch {
      // primary selection not available
    }

    return [];
  }

  private readClipboardPath(): Promise<string | null> {
    switch (process.platform) {
      case "darwin":
        return this.readMacClipboard();
      case "win32":
        return this.readWindowsClipboard();
      case "linux":
        return this.readLinuxClipboard();
      default:
        return Promise.resolve(null);
    }
  }

  private async readMacClipboard(): Promise<string | null> {
    try {
      const { stdout } = await execAsync("pbpaste");
      const candidate = sanitizeOutput(stdout);
      if (!candidate) {
        return null;
      }

      const decoded = decodeFileUri(candidate);
      if (decoded && isPathCandidate(decoded)) {
        return decoded;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async readWindowsClipboard(): Promise<string | null> {
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.Clipboard]::GetText()
    `;
    try {
      const escaped = script.replace(/"/g, '""');
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "${escaped}"`,
        { windowsHide: true }
      );
      const candidate = sanitizeOutput(stdout);
      if (!candidate) {
        return null;
      }

      const decoded = decodeFileUri(candidate);
      if (decoded && isPathCandidate(decoded)) {
        return decoded;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async readLinuxClipboard(): Promise<string | null> {
    try {
      const { stdout } = await execAsync("xclip -selection clipboard -o");
      const candidate = sanitizeOutput(stdout);
      if (!candidate) {
        return null;
      }

      const decoded = decodeFileUri(candidate);
      if (decoded && isPathCandidate(decoded)) {
        return decoded;
      }
    } catch {
      // ignore
    }
    return null;
  }
}
