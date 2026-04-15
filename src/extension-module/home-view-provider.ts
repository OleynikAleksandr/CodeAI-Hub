import {
  Uri,
  type WebviewView,
  type WebviewViewProvider,
  window,
} from "vscode";
import { WebviewHtmlGenerator } from "../core/webview-module/webview-html-generator";
import type { CoreProcessManager } from "./core/core-process-manager";
import type { WebviewMessage } from "./home-view-message-router";
import { HomeViewMessageRouter } from "./home-view-message-router";

export class HomeViewProvider implements WebviewViewProvider {
  static readonly viewType = "codeaiHubView";

  private readonly extensionUri: Uri;
  private readonly webviewUIRootPath: string;
  private readonly htmlGenerator: WebviewHtmlGenerator;
  private readonly messageRouter: HomeViewMessageRouter;
  private readonly coreConfig?: {
    readonly httpUrl: string;
    readonly wsUrl: string;
    readonly workspacePath?: string;
  };
  private currentView: WebviewView | null = null;
  private pendingShowSettings = false;

  constructor(
    extensionUri: Uri,
    webviewUIRootPath: string,
    coreConfig?: {
      readonly httpUrl: string;
      readonly wsUrl: string;
      readonly workspacePath?: string;
    },
    coreProcessManager?: CoreProcessManager
  ) {
    this.extensionUri = extensionUri;
    this.webviewUIRootPath = webviewUIRootPath;
    this.htmlGenerator = new WebviewHtmlGenerator();
    this.messageRouter = new HomeViewMessageRouter(
      extensionUri.fsPath,
      coreProcessManager
    );
    this.coreConfig = coreConfig;
  }

  resolveWebviewView(webviewView: WebviewView): void {
    try {
      this.resolveWebviewViewSync(webviewView);
    } catch (error: unknown) {
      window.showWarningMessage(
        `Failed to initialize settings webview: ${String(error)}`
      );
    }
  }

  private resolveWebviewViewSync(webviewView: WebviewView): void {
    const { webview } = webviewView;
    this.currentView = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        Uri.file(this.webviewUIRootPath),
        Uri.joinPath(this.extensionUri, "media"),
      ],
    };

    webview.html = this.htmlGenerator.generate(
      webview,
      this.extensionUri,
      this.webviewUIRootPath,
      {
        coreBridgeConfig: this.coreConfig,
        localizationBootstrap: null,
      }
    );

    webview.onDidReceiveMessage((message: WebviewMessage) => {
      this.messageRouter.handleMessage(message, webview);
    });

    if (this.pendingShowSettings) {
      this.pendingShowSettings = false;
      this.showSettingsInternal();
    }
  }

  showSettingsPlaceholder(): void {
    if (this.currentView) {
      this.currentView.show?.(true);
      this.showSettingsInternal();
      return;
    }

    this.pendingShowSettings = true;
    window.showInformationMessage("Settings view will open shortly…");
  }

  private showSettingsInternal(): void {
    if (!this.currentView) {
      return;
    }

    this.currentView.webview
      .postMessage({ type: "ui:showSettings" })
      .then(undefined, (error) => {
        window.showWarningMessage(
          `Failed to open settings: ${(error as Error).message}`
        );
      });
  }
}
