#ifndef CODEAI_HUB_WINDOW_STATE_TRACKER_MAC_H_
#define CODEAI_HUB_WINDOW_STATE_TRACKER_MAC_H_

#import <Cocoa/Cocoa.h>

@interface WindowStateTracker : NSObject

+ (void)startTrackingWindow:(NSWindow *)window;
+ (void)stopTrackingWindow:(NSWindow *)window;

@end

#endif  // CODEAI_HUB_WINDOW_STATE_TRACKER_MAC_H_
