export type IFilePathFacade = {
  startMonitoring(): Promise<void>;
  stopMonitoring(): void;
  getDraggedFilePaths(): Promise<string[] | null>;
  getDraggedFilePath(): Promise<string | null>;
  copyPathToClipboard(filePath: string): Promise<void>;
  getClipboardPath(): Promise<string | null>;
  cachePaths(paths: readonly string[]): void;
  clearCache(): void;
  dispose(): void;
};
