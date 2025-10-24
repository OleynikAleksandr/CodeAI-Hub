#import <Cocoa/Cocoa.h>

#include "cef_application_mac.h"
#include "cef_sandbox_mac.h"
#include "wrapper/cef_library_loader.h"
#include "launcher_app.h"

int main(int argc, char* argv[]) {
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInMain()) {
    fprintf(stderr, "CodeAIHubLauncher: failed to load CEF framework\n");
    return 1;
  }

  CefMainArgs main_args(argc, argv);
  CefRefPtr<LauncherApp> app(new LauncherApp());

  int exit_code = CefExecuteProcess(main_args, app, nullptr);
  if (exit_code >= 0) {
    return exit_code;
  }

  CefSettings settings;
  settings.no_sandbox = true;
  settings.windowless_rendering_enabled = false;
  NSString* bundleResources = [[NSBundle mainBundle] resourcePath];
  if ([bundleResources length] > 0U) {
    const char* bundle_resources_fs_path = [bundleResources fileSystemRepresentation];
    if (bundle_resources_fs_path != nullptr) {
      CefString(&settings.resources_dir_path) = bundle_resources_fs_path;
    }
  }
  NSString* frameworksDir = [[NSBundle mainBundle] privateFrameworksPath];
  if ([frameworksDir length] > 0U) {
    NSString* cefFramework =
        [frameworksDir stringByAppendingPathComponent:
                           @"Chromium Embedded Framework.framework"];
    const char* framework_fs_path = [cefFramework fileSystemRepresentation];
    if (framework_fs_path != nullptr) {
      CefString(&settings.framework_dir_path) = framework_fs_path;
    }

    NSString* frameworkResources =
        [cefFramework stringByAppendingPathComponent:@"Resources"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:frameworkResources]) {
      const char* framework_res_path =
          [frameworkResources fileSystemRepresentation];
      fprintf(stderr, "CodeAIHubLauncher: framework resources path %s\n",
              framework_res_path);
      if (framework_res_path != nullptr) {
        NSString* icuDataPath =
            [frameworkResources stringByAppendingPathComponent:@"icudtl.dat"];
        if ([[NSFileManager defaultManager] fileExistsAtPath:icuDataPath]) {
          const char* icu_fs_path =
              [icuDataPath fileSystemRepresentation];
          if (icu_fs_path != nullptr) {
            setenv("CEF_ICU_DATA_PATH", icu_fs_path, 1);
          }
        }
      }
      NSString* localesPath =
          [frameworkResources stringByAppendingPathComponent:@"locales"];
      if ([[NSFileManager defaultManager] fileExistsAtPath:localesPath]) {
        const char* locales_fs_path = [localesPath fileSystemRepresentation];
        if (locales_fs_path != nullptr) {
          CefString(&settings.locales_dir_path) = locales_fs_path;
        }
      }
    }
    NSString* helperExecutable =
        [frameworksDir stringByAppendingPathComponent:
                          @"CodeAIHubLauncher Helper.app/Contents/MacOS/"
                          @"CodeAIHubLauncher Helper"];
    if ([[NSFileManager defaultManager] fileExistsAtPath:helperExecutable]) {
      const char* helper_fs_path =
          [helperExecutable fileSystemRepresentation];
      if (helper_fs_path != nullptr) {
        CefString(&settings.browser_subprocess_path) = helper_fs_path;
      }
    }
  }
  fprintf(stderr, "CodeAIHubLauncher: calling CefInitialize\n");
  if (!CefInitialize(main_args, settings, app, nullptr)) {
    fprintf(stderr, "CodeAIHubLauncher: CefInitialize failed\n");
    return CefGetExitCode();
  }
  fprintf(stderr, "CodeAIHubLauncher: CefInitialize succeeded\n");
  CefRunMessageLoop();
  CefShutdown();
  fprintf(stderr, "CodeAIHubLauncher: shutdown complete\n");
  return 0;
}
