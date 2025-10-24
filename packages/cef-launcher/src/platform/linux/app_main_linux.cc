#include "cef_app.h"
#include "launcher_app.h"

int main(int argc, char* argv[]) {
  CefEnableHighDPISupport();
  CefMainArgs main_args(argc, argv);
  CefRefPtr<LauncherApp> app(new LauncherApp());

  int exit_code = CefExecuteProcess(main_args, app, nullptr);
  if (exit_code >= 0) {
    return exit_code;
  }

  CefSettings settings;
  settings.no_sandbox = true;

  CefInitialize(main_args, settings, app, nullptr);
  CefRunMessageLoop();
  CefShutdown();
  return 0;
}
