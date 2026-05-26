import type { LocalizationRuntimeBootstrapSnapshot } from "@codeai-hub/localization";
import {
  Uri,
  type WebviewView,
  type WebviewViewProvider,
  window,
  workspace,
} from "vscode";
import { WebviewHtmlGenerator } from "../core/webview-module/webview-html-generator";
import type { CoreProcessManager } from "./core/core-process-manager";
import type { WebviewMessage } from "./home-view-message-router";
import { HomeViewMessageRouter } from "./home-view-message-router";
import {
  createExtensionLocalizationFacade,
  LocalizationRuntimeService,
} from "./settings/localization-runtime-service";
import { loadSettingsSnapshot } from "./settings/settings-storage";

export class HomeViewProvider implements WebviewViewProvider {
  static readonly viewType = "codeaiHubView";

  private readonly extensionUri: Uri;
  private readonly webviewUIRootPath: string;
  private readonly htmlGenerator: WebviewHtmlGenerator;
  private readonly messageRouter: HomeViewMessageRouter;
  private readonly localizationRuntimeService: LocalizationRuntimeService;
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
    this.localizationRuntimeService = new LocalizationRuntimeService(
      createExtensionLocalizationFacade(
        coreConfig?.workspacePath ?? workspace.workspaceFolders?.[0]?.uri.fsPath
      )
    );
  }

  async resolveWebviewView(webviewView: WebviewView): Promise<void> {
    try {
      await this.resolveWebviewViewAsync(webviewView);
    } catch (error: unknown) {
      window.showWarningMessage(
        `Failed to initialize settings webview: ${String(error)}`
      );
    }
  }

  private async resolveWebviewViewAsync(
    webviewView: WebviewView
  ): Promise<void> {
    const { webview } = webviewView;
    this.currentView = webviewView;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        Uri.file(this.webviewUIRootPath),
        Uri.joinPath(this.extensionUri, "media"),
      ],
    };

    const localizationBootstrap = await this.loadLocalizationBootstrap();

    webview.html = this.htmlGenerator.generate(
      webview,
      this.extensionUri,
      this.webviewUIRootPath,
      {
        coreBridgeConfig: this.coreConfig,
        localizationBootstrap,
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

  private async loadLocalizationBootstrap(): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    try {
      const settings = loadSettingsSnapshot();
      return await this.localizationRuntimeService.loadRuntimeBootstrapSnapshot(
        settings
      );
    } catch (error: unknown) {
      // Non-fatal: webview renders with English fallbacks and relies on the
      // subsequent `settings:loaded` message for the actual payload.
      window.showWarningMessage(
        `Failed to load localization bootstrap for settings webview: ${String(error)}`
      );
      return null;
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
