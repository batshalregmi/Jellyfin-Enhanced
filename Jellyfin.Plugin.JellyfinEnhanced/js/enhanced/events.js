/**
 * @file Manages event listeners for long-press 2x speed feature.
 */
(function(JE) {
    'use strict';

    /**
     * Checks if the current page is a video playback page.
     * @returns {boolean}
     */
    JE.isVideoPage = () => {
        return !!document.querySelector('video');
    };

    /**
     * Initializes event listeners for long-press 2x speed feature.
     */
    JE.initializeEnhancedScript = function() {
        // Add Long Press listeners if enabled
        if (JE.currentSettings.longPress2xEnabled) {
            const videoPageCheck = (handler) => (e) => {
                if (JE.isVideoPage()) {
                    // Don't interfere with clicks on OSD buttons
                    if (e.target.closest('.osdControls')) return;
                    handler(e);
                }
            };

            document.addEventListener('mousedown', videoPageCheck(JE.handleLongPressDown), true);
            document.addEventListener('mouseup', videoPageCheck(JE.handleLongPressUp), true);
            document.addEventListener('mousemove', videoPageCheck(JE.handleLongPressMove), true);
            document.addEventListener('click', videoPageCheck(JE.handleLongPressClick), true);
            document.addEventListener('mouseleave', videoPageCheck(JE.handleLongPressCancel), true);
            document.addEventListener('touchstart', videoPageCheck(JE.handleLongPressDown), { capture: true, passive: true });
            document.addEventListener('touchmove', videoPageCheck(JE.handleLongPressMove), { capture: true, passive: true });
            document.addEventListener('touchend', videoPageCheck(JE.handleLongPressUp), { capture: true, passive: false });
            document.addEventListener('touchcancel', videoPageCheck(JE.handleLongPressCancel), { capture: true, passive: false });
        }
    };

})(window.JellyfinEnhanced);