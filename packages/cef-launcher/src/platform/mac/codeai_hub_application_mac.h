#ifndef CODEAI_HUB_APPLICATION_MAC_H_
#define CODEAI_HUB_APPLICATION_MAC_H_

#import <Cocoa/Cocoa.h>

#include "cef_application_mac.h"

@interface CodeAIHubApplication : NSApplication <CefAppProtocol>
@end

@interface CodeAIHubAppDelegate : NSObject <NSApplicationDelegate>

- (void)createApplication:(id)object;
- (void)tryToTerminateApplication:(NSApplication*)app;

@end

#endif  // CODEAI_HUB_APPLICATION_MAC_H_
