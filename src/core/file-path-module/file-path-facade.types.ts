export interface IFilePathFacade {
  cachePaths(paths: readonly string[]): void;
  clearCache(): void;
  copyPathToClipboard(filePath: string): Promise<void>;
  dispose(): void;
  getClipboardPath(): Promise<string | null>;
  getDraggedFilePath(): Promise<string | null>;
  getDraggedFilePaths(): Promise<string[] | null>;
  startMonitoring(): Promise<void>;
  stopMonitoring(): void;
}
