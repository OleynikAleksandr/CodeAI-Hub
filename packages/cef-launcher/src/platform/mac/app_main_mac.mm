#import <Cocoa/Cocoa.h>

#include "cef_application_mac.h"
#include "cef_sandbox_mac.h"
#include "wrapper/cef_library_loader.h"
#include "launcher_app.h"

namespace {

// Previous uncaught-exception handler, captured before we install ours so
// non-matching exceptions still flow through AppKit's default crash reporter.
static NSUncaughtExceptionHandler* g_previous_uncaught_handler = nullptr;

// Chromium 141 (shipped inside the current CEF framework) occasionally sends
// an AppKit-private selector to -[NSApplication ...] during async browser
// teardown on macOS 26.x. The selector no longer exists on that OS version,
// so objc_msgSend is invoked with a NULL/corrupted SEL and the resulting
// NSInvalidArgumentException propagates all the way up to
// NSApplicationUncaughtExceptionHandler -> +[NSApplication _crashOnException:],
// which aborts the process and surfaces a "quit unexpectedly" dialog.
//
// The crash is triggered deterministically by clicking the red window-close
// button (TryCloseBrowser path), but does NOT reproduce when the user quits
// via Cmd+Q or the Dock menu, which unwind through -[NSApplication stop:]
// instead of the Chromium teardown callback. See
// doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_Shutdown_Crash_Mitigation_Architecture.md
// and BUG-2026-04-22-01.
//
// Real fix requires CEF/Chromium upgrade to a build that understands macOS 26
// semantics; until then we swallow this specific exception here so the rest
// of the browser-teardown path (CefQuitMessageLoop -> main() returning ->
// CefShutdown) can still complete cleanly.
void CodeAIHubUncaughtExceptionHandler(NSException* exception) {
  NSString* name = [exception name];
  NSString* reason = [exception reason];
  if ([name isEqualToString:NSInvalidArgumentException] &&
      [reason rangeOfString:@"unrecognized selector sent to instance"].location
          != NSNotFound &&
      [reason rangeOfString:@"NSApplication"].location != NSNotFound) {
    fprintf(stderr,
            "CodeAIHubLauncher: suppressed NSApplication unrecognized "
            "selector (CEF/macOS compatibility workaround): %s\n",
            [reason UTF8String] != nullptr ? [reason UTF8String] : "");
    return;
  }

  if (g_previous_uncaught_handler != nullptr) {
    g_previous_uncaught_handler(exception);
  }
}

void InstallCodeAIHubUncaughtExceptionHandler() {
  g_previous_uncaught_handler = NSGetUncaughtExceptionHandler();
  NSSetUncaughtExceptionHandler(&CodeAIHubUncaughtExceptionHandler);
}

void CreateApplicationMenu() {
  NSApplication* app = [NSApplication sharedApplication];
  if ([app mainMenu] != nil) {
    return;
  }

  NSMenu* menubar = [[NSMenu alloc] initWithTitle:@""];
  [app setMainMenu:menubar];

  NSMenuItem* appMenuItem = [[NSMenuItem alloc] initWithTitle:@"" action:nil keyEquivalent:@""];
  [menubar addItem:appMenuItem];

  NSMenu* appMenu = [[NSMenu alloc] initWithTitle:@""];
  NSString* appName = [[NSProcessInfo processInfo] processName];
  NSString* quitTitle = [NSString stringWithFormat:@"Quit %@", appName];
  NSMenuItem* quitItem = [[NSMenuItem alloc] initWithTitle:quitTitle
                                                    action:@selector(terminate:)
                                             keyEquivalent:@"q"];
  [quitItem setKeyEquivalentModifierMask:NSEventModifierFlagCommand];
  [appMenu addItem:quitItem];
  [appMenuItem setSubmenu:appMenu];

  NSMenuItem* editMenuItem = [[NSMenuItem alloc] initWithTitle:@"Edit" action:nil keyEquivalent:@""];
  [menubar addItem:editMenuItem];

  NSMenu* editMenu = [[NSMenu alloc] initWithTitle:@"Edit"];

  auto addEditCommand = ^(NSString* title, SEL action, NSString* key) {
    NSMenuItem* item = [[NSMenuItem alloc] initWithTitle:title action:action keyEquivalent:key];
    [item setKeyEquivalentModifierMask:NSEventModifierFlagCommand];
    [item setTarget:nil];
    [editMenu addItem:item];
  };

  addEditCommand(@"Cut", @selector(cut:), @"x");
  addEditCommand(@"Copy", @selector(copy:), @"c");
  addEditCommand(@"Paste", @selector(paste:), @"v");
  addEditCommand(@"Select All", @selector(selectAll:), @"a");

  [editMenuItem setSubmenu:editMenu];
}

}  // namespace

int main(int argc, char* argv[]) {
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInMain()) {
    fprintf(stderr, "CodeAIHubLauncher: failed to load CEF framework\n");
    return 1;
  }

  // Install our uncaught-exception handler before any CEF code runs so the
  // Chromium browser-teardown path triggered by the red window-close button
  // cannot terminate the process through AppKit's default crash reporter on
  // macOS 26.x. See CodeAIHubUncaughtExceptionHandler above for details.
  InstallCodeAIHubUncaughtExceptionHandler();

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
  CreateApplicationMenu();
  CefRunMessageLoop();
  CefShutdown();
  fprintf(stderr, "CodeAIHubLauncher: shutdown complete\n");
  return 0;
}
