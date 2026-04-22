#import <Cocoa/Cocoa.h>

#include <objc/runtime.h>

#include "cef_application_mac.h"
#include "cef_sandbox_mac.h"
#include "wrapper/cef_library_loader.h"
#include "launcher_app.h"

// Chromium 141 (shipped inside the current CEF framework) occasionally sends
// an AppKit-private selector to -[NSApplication ...] during async browser
// teardown on macOS 26.x. The selector no longer exists on that OS version,
// so objc_msgSend is invoked with a NULL/corrupted SEL and the resulting
// NSInvalidArgumentException propagates up through
// _objc_terminate -> __handleUncaughtException ->
// NSApplicationUncaughtExceptionHandler -> -[NSApplication reportException:]
// -> +[NSApplication _crashOnException:], which aborts the process.
//
// The crash reproduces deterministically on the red window-close button
// path (LauncherWindowDelegate::CanClose -> TryCloseBrowser ->
// Chromium async teardown) and does NOT reproduce under Cmd+Q / Dock
// Quit, which unwind via -[NSApplication stop:] and bypass the buggy
// teardown callback. See
// doc/SolidWorks-WorkFlow/Plans/Archive/CEF_MacOS_ReportException_Swizzle_Architecture.md
// and BUG-2026-04-22-01.
//
// The 1.2.50 attempt with NSSetUncaughtExceptionHandler() did not work:
// AppKit reinstalls its own handler during -finishLaunching and
// +[NSApplication _crashOnException:] bypasses the standard uncaught
// handler chain on macOS 26 regardless. This swizzle operates one level
// lower: it replaces the IMP of -[NSApplication reportException:] itself
// via method_exchangeImplementations, installed from a category +load
// which the Objective-C runtime calls during dyld image load — before
// main() and any AppKit / CEF init. AppKit cannot undo that; when it
// later calls -[NSApplication reportException:] the runtime dispatches
// into our codeai_reportException: implementation instead.
//
// Real fix requires CEF/Chromium upgrade to a build that understands
// macOS 26 semantics; until then we swallow this specific exception so
// the rest of the teardown (OnBeforeClose -> CefQuitMessageLoop ->
// main() returning -> CefShutdown) can still complete cleanly.
@interface NSApplication (CodeAIHubReportExceptionSuppression)
- (void)codeai_reportException:(NSException*)exception;
@end

@implementation NSApplication (CodeAIHubReportExceptionSuppression)

- (void)codeai_reportException:(NSException*)exception {
  NSString* name = [exception name];
  NSString* reason = [exception reason];
  if (name != nil && reason != nil &&
      [name isEqualToString:NSInvalidArgumentException] &&
      [reason rangeOfString:@"unrecognized selector sent to instance"].location
          != NSNotFound &&
      [reason rangeOfString:@"NSApplication"].location != NSNotFound) {
    const char* reason_utf8 = [reason UTF8String];
    fprintf(stderr,
            "CodeAIHubLauncher: suppressed NSApplication unrecognized "
            "selector via reportException: swizzle (CEF/macOS 26 "
            "compatibility workaround): %s\n",
            reason_utf8 != nullptr ? reason_utf8 : "");
    return;
  }

  // After method_exchangeImplementations swaps the two selectors, calling
  // codeai_reportException: on self dispatches into the ORIGINAL
  // -[NSApplication reportException:] IMP. This is the standard ObjC
  // swizzle trampoline; do not collapse to [super reportException:...].
  [self codeai_reportException:exception];
}

+ (void)load {
  Method original = class_getInstanceMethod([NSApplication class],
                                            @selector(reportException:));
  Method replacement = class_getInstanceMethod(
      [NSApplication class], @selector(codeai_reportException:));
  if (original != nullptr && replacement != nullptr) {
    method_exchangeImplementations(original, replacement);
  }
}

@end

namespace {

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

  // The NSApplication reportException: swizzle installed via the category
  // +load above is already active by the time we reach main() — no explicit
  // install step is needed here.

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
