import {
  Uri,
  type WebviewView,
  type WebviewViewProvider,
  window,
} from "vscode";
import { WebviewHtmlGenerator } from "../core/webview-module/webview-html-generator";
import type { WebviewMessage } from "./home-view-message-router";
import { HomeViewMessageRouter } from "./home-view-message-router";

export class HomeViewProvider implements WebviewViewProvider {
  static readonly viewType = "codeaiHubView";

  private readonly extensionUri: Uri;
  private readonly htmlGenerator: WebviewHtmlGenerator;
  private readonly messageRouter: HomeViewMessageRouter;
  private readonly coreConfig?: { httpUrl: string; wsUrl: string };
  private currentView: WebviewView | null = null;
  private pendingShowSettings = false;

  constructor(
    extensionUri: Uri,
    coreConfig?: { httpUrl: string; wsUrl: string }
  ) {
    this.extensionUri = extensionUri;
    this.htmlGenerator = new WebviewHtmlGenerator();
    this.messageRouter = new HomeViewMessageRouter();
    this.coreConfig = coreConfig;
  }

  resolveWebviewView(webviewView: WebviewView): void {
    const { webview } = webviewView;
    this.currentView = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [Uri.joinPath(this.extensionUri, "media")],
    };

    webview.html = this.htmlGenerator.generate(webview, this.extensionUri, {
      coreBridgeConfig: this.coreConfig,
    });

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
