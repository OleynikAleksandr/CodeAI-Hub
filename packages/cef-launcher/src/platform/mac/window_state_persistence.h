#ifndef CODEAI_HUB_WINDOW_STATE_PERSISTENCE_MAC_H_
#define CODEAI_HUB_WINDOW_STATE_PERSISTENCE_MAC_H_

#import <Cocoa/Cocoa.h>

@interface WindowStatePersistence : NSObject

+ (void)restoreWindow:(NSWindow*)window;
+ (void)persistWindow:(NSWindow*)window;

@end

#endif  // CODEAI_HUB_WINDOW_STATE_PERSISTENCE_MAC_H_
