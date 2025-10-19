import { ClipboardHandler } from "../clipboard-handler";
import { FilePathCache } from "../file-path-cache";
import type { IFilePathFacade } from "../file-path-facade.types";
import { PlatformFileHandler } from "../platform-file-handler";

export class FilePathFacade implements IFilePathFacade {
  private readonly cache: FilePathCache;
  private readonly clipboard: ClipboardHandler;
  private readonly platformHandler: PlatformFileHandler;

  constructor() {
    this.cache = new FilePathCache();
    this.clipboard = new ClipboardHandler();
    this.platformHandler = new PlatformFileHandler();
  }

  async startMonitoring(): Promise<void> {
    await this.platformHandler.startMonitoring();
  }

  stopMonitoring(): void {
    this.platformHandler.stopMonitoring();
  }

  async getDraggedFilePaths(): Promise<string[] | null> {
    const cachedPaths = this.cache.getCachedPaths();
    if (cachedPaths) {
      return cachedPaths;
    }

    const paths = await this.platformHandler.getDraggedFiles();
    if (paths && paths.length > 0) {
      this.cache.cachePath(paths.join("\n"));
      return paths;
    }

    return null;
  }

  async getDraggedFilePath(): Promise<string | null> {
    const paths = await this.getDraggedFilePaths();
    return paths && paths.length > 0 ? paths[0] : null;
  }

  async copyPathToClipboard(filePath: string): Promise<void> {
    await this.clipboard.copyPathToClipboard(filePath);
    this.cache.cachePath(filePath);
  }

  getClipboardPath(): Promise<string | null> {
    return this.clipboard.getClipboardPath();
  }

  cachePaths(paths: readonly string[]): void {
    if (paths.length > 0) {
      this.cache.cachePath(paths.join("\n"));
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  dispose(): void {
    this.stopMonitoring();
    this.cache.clear();
  }
}
