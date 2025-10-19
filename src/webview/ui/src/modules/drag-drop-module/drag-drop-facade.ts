import type { DragDropLogger } from "./data-transfer-file-extractor";
import type { DragDropCallbacks } from "./drag-drop-handler";
import { DragDropHandler } from "./drag-drop-handler";
import { FilePathProcessor } from "./file-path-processor";
import { MessageHandler } from "./message-handler";

export type DragDropConfig = {
  readonly container: HTMLElement;
  readonly onValueChange: (newValue: string) => void;
  readonly getCurrentValue: () => string;
  readonly onDragStateChange?: (isDragging: boolean) => void;
};

export class DragDropFacade {
  private readonly dragHandler: DragDropHandler;
  private readonly pathProcessor: FilePathProcessor;
  private readonly messageHandler: MessageHandler;
  private config: DragDropConfig | null = null;
  private isDragging = false;

  constructor(logger?: DragDropLogger) {
    this.dragHandler = new DragDropHandler({ logger });
    this.pathProcessor = new FilePathProcessor();
    this.messageHandler = new MessageHandler(logger);
  }

  initialize(config: DragDropConfig): void {
    this.config = config;

    const callbacks: DragDropCallbacks = {
      onDragEnter: (isShiftPressed) => this.handleDragEnter(isShiftPressed),
      onDragLeave: () => this.handleDragLeave(),
      onFileDrop: (paths) => this.handleFileDrop(paths),
      onFallbackRequest: () => this.handleFallbackRequest(),
    };

    this.dragHandler.attach(config.container, callbacks);
    this.messageHandler.startListening({
      onPathInsert: (path) => this.handlePathInsert(path),
      onClipboardContent: (content) => this.handleClipboardContent(content),
    });
  }

  destroy(): void {
    this.dragHandler.detach();
    this.messageHandler.stopListening();
    this.pathProcessor.clear();
    this.config = null;
    this.isDragging = false;
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  private handleDragEnter(isShiftPressed: boolean): void {
    if (!isShiftPressed) {
      return;
    }

    this.isDragging = true;
    this.config?.onDragStateChange?.(true);
  }

  private handleDragLeave(): void {
    this.isDragging = false;
    this.config?.onDragStateChange?.(false);
  }

  private handleFileDrop(paths: readonly string[]): void {
    if (!this.config) {
      return;
    }

    const currentValue = this.config.getCurrentValue();
    const newValue = this.pathProcessor.processMultiplePaths(
      paths,
      currentValue
    );
    if (newValue !== null) {
      this.config.onValueChange(newValue);
    }
  }

  private handleFallbackRequest(): void {
    this.messageHandler.requestFilePathGrab();
  }

  private handlePathInsert(path: string): void {
    if (!this.config) {
      return;
    }

    const currentValue = this.config.getCurrentValue();
    if (path.includes('"') && path.includes("\n")) {
      const mergedValue = currentValue ? `${currentValue}\n${path}` : path;
      this.config.onValueChange(mergedValue);
      return;
    }

    const newValue = this.pathProcessor.processSinglePath(path, currentValue);
    if (newValue !== null) {
      this.config.onValueChange(newValue);
    }
  }

  private handleClipboardContent(content: string): void {
    if (!this.config) {
      return;
    }

    const currentValue = this.config.getCurrentValue();
    const newValue = this.pathProcessor.processSinglePath(
      content,
      currentValue
    );
    if (newValue !== null) {
      this.config.onValueChange(newValue);
    }
  }
}
