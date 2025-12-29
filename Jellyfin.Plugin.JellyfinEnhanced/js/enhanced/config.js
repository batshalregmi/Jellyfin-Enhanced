// /js/enhanced/config.js
/**
 * @file Manages plugin configuration, user settings, and shared state.
 */
(function(JE) {
    'use strict';

    /**
     * Constants derived from the plugin configuration.
     * @type {object}
     */
    JE.CONFIG = {
        // Use getters so values always reflect the latest pluginConfig even if assigned later
        get TOAST_DURATION() { return (JE.pluginConfig && JE.pluginConfig.ToastDuration) || 1500; },
        get HELP_PANEL_AUTOCLOSE_DELAY() { return (JE.pluginConfig && JE.pluginConfig.HelpPanelAutocloseDelay) || 15000; }
    };

    /**
     * Shared state variables used across different components.
     * @type {object}
     */
    JE.state = JE.state || {};

    /**
     * Saves user settings to the server.
     */
    JE.saveUserSettings = async (fileName, settings) => {
        if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId) {
            console.error("🪼 Jellyfin Enhanced: ApiClient not available");
            return;
        }
        try {
            const userId = ApiClient.getCurrentUserId();
            if (!userId) {
                console.error("🪼 Jellyfin Enhanced: User ID not available");
                return;
            }

            await ApiClient.ajax({
                type: 'POST',
                url: ApiClient.getUrl(`/JellyfinEnhanced/user-settings/${userId}/${fileName}`),
                data: JSON.stringify(settings),
                contentType: 'application/json'
            });
        } catch (e) {
            console.error(`🪼 Jellyfin Enhanced: Failed to save ${fileName}:`, e);
        }
    };

    /**
     * Loads and merges settings from user config, plugin defaults, and hardcoded fallbacks.
     */
    JE.loadSettings = () => {
        const userSettings = JE.userConfig?.settings || {};
        const pluginDefaults = JE.pluginConfig || {};

        const hardcodedDefaults = {
            longPress2xEnabled: false
        };

        const mergedSettings = {};
        for (const key in hardcodedDefaults) {
            if (userSettings.hasOwnProperty(key) && userSettings[key] !== null && userSettings[key] !== undefined) {
                mergedSettings[key] = userSettings[key];
            } else if (pluginDefaults.hasOwnProperty(key) && pluginDefaults[key] !== null && pluginDefaults[key] !== undefined) {
                mergedSettings[key] = pluginDefaults[key];
            } else {
                mergedSettings[key] = hardcodedDefaults[key];
            }
        }

        return mergedSettings;
    };

})(window.JellyfinEnhanced);