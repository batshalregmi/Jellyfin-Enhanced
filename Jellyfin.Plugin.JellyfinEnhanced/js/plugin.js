// /js/plugin.js
(function() {
    'use strict';

    // Create the global namespace immediately with placeholders
    window.JellyfinEnhanced = {
        pluginConfig: {},
        userConfig: { settings: {} },
        translations: {},
        pluginVersion: 'unknown',
        state: {},
        // Placeholder functions
        t: (key, params = {}) => { // Actual implementation defined later
            const translations = window.JellyfinEnhanced?.translations || {};
            let text = translations[key] || key;
            if (params) {
                for (const [param, value] of Object.entries(params)) {
                    text = text.replace(new RegExp(`{${param}}`, 'g'), value);
                }
            }
            return text;
        },
        loadSettings: () => { console.warn("🪼 Jellyfin Enhanced: loadSettings called before config.js loaded"); return {}; },
        saveUserSettings: async (fileName) => { console.warn(`🪼 Jellyfin Enhanced: saveUserSettings(${fileName}) called before config.js loaded`); }
    };

    const JE = window.JellyfinEnhanced; // Alias for internal use

    /**
     * Converts PascalCase object keys to camelCase recursively.
     * @param {object} obj - The object to convert.
     * @returns {object} - A new object with camelCase keys.
     */
    function toCamelCase(obj) {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
            return obj; // Return primitives and arrays as-is
        }
        const camelCased = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
                camelCased[camelKey] = toCamelCase(obj[key]); // Recursive for nested objects
            }
        }
        return camelCased;
    }

    /**
     * Loads the appropriate language file based on the user's settings.
     * Attempts to fetch from GitHub first (with caching), falls back to bundled translations.
     * @returns {Promise<object>} A promise that resolves to the translations object.
     */
    async function loadTranslations() {
        const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/n00bcodr/Jellyfin-Enhanced/main/Jellyfin.Plugin.JellyfinEnhanced/js/locales';
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        try {
            // Get plugin version first
            let pluginVersion = window.JellyfinEnhanced?.pluginVersion;
            if (!pluginVersion || pluginVersion === 'unknown') {
                // Fetch version if not loaded yet
                try {
                    const versionResponse = await fetch(ApiClient.getUrl('/JellyfinEnhanced/version'));
                    if (versionResponse.ok) {
                        pluginVersion = await versionResponse.text();
                        if (window.JellyfinEnhanced) {
                            window.JellyfinEnhanced.pluginVersion = pluginVersion;
                        }
                    }
                } catch (e) {
                    console.warn('🪼 Jellyfin Enhanced: Failed to fetch plugin version', e);
                    pluginVersion = 'unknown';
                }
            }

            // Wait briefly for ApiClient user to potentially become available
            let user = ApiClient.getCurrentUser ? ApiClient.getCurrentUser() : null;
            if (user instanceof Promise) {
                user = await user;
            }

            const userId = user?.Id;
            let lang = 'en'; // Default to English

            if (userId) {
                const storageKey = `${userId}-language`;
                const storedLang = localStorage.getItem(storageKey);
                if (storedLang) {
                    lang = storedLang.split('-')[0]; // Use base language code
                }
            }

            // Clean up old translation caches from previous versions
            try {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('JE_translation_') || key.startsWith('JE_translation_ts_'))) {
                        // Remove if it doesn't match current version
                        if (!key.includes(`_${pluginVersion}`)) {
                            localStorage.removeItem(key);
                            console.log(`🪼 Jellyfin Enhanced: Removed old translation cache: ${key}`);
                        }
                    }
                }
            } catch (e) {
                console.warn('🪼 Jellyfin Enhanced: Failed to clean up old translation caches', e);
            }

            // Check if we have a cached version
            const cacheKey = `JE_translation_${lang}_${pluginVersion}`;
            const timestampKey = `JE_translation_ts_${lang}_${pluginVersion}`;
            const cachedTranslations = localStorage.getItem(cacheKey);
            const cachedTimestamp = localStorage.getItem(timestampKey);

            if (cachedTranslations && cachedTimestamp) {
                const age = Date.now() - parseInt(cachedTimestamp, 10);
                if (age < CACHE_DURATION) {
                    console.log(`🪼 Jellyfin Enhanced: Using cached translations for ${lang} (age: ${Math.round(age / 1000 / 60)} minutes, version: ${pluginVersion})`);
                    try {
                        return JSON.parse(cachedTranslations);
                    } catch (e) {
                        console.warn('🪼 Jellyfin Enhanced: Failed to parse cached translations, will fetch fresh', e);
                    }
                }
            }

            // Try fetching from GitHub
            try {
                console.log(`🪼 Jellyfin Enhanced: Fetching translations for ${lang} from GitHub...`);
                const githubResponse = await fetch(`${GITHUB_RAW_BASE}/${lang}.json`, {
                    method: 'GET',
                    cache: 'no-cache', // We manage our own cache
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (githubResponse.ok) {
                    const translations = await githubResponse.json();

                    // Cache the successful fetch
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(translations));
                        localStorage.setItem(timestampKey, Date.now().toString());
                        console.log(`🪼 Jellyfin Enhanced: Successfully fetched and cached translations for ${lang} from GitHub (version: ${pluginVersion})`);
                    } catch (storageError) {
                        console.warn('🪼 Jellyfin Enhanced: Failed to cache translations (localStorage full?)', storageError);
                    }

                    return translations;
                }

                // If GitHub fetch failed with 404, might be a language that doesn't exist
                if (githubResponse.status === 404 && lang !== 'en') {
                    console.warn(`🪼 Jellyfin Enhanced: Language ${lang} not found on GitHub, falling back to English`);
                    // Recursively try English from GitHub
                    const englishResponse = await fetch(`${GITHUB_RAW_BASE}/en.json`, {
                        method: 'GET',
                        cache: 'no-cache',
                        headers: { 'Accept': 'application/json' }
                    });

                    if (englishResponse.ok) {
                        const translations = await englishResponse.json();
                        try {
                            const enCacheKey = `JE_translation_en_${pluginVersion}`;
                            const enTimestampKey = `JE_translation_ts_en_${pluginVersion}`;
                            localStorage.setItem(enCacheKey, JSON.stringify(translations));
                            localStorage.setItem(enTimestampKey, Date.now().toString());
                        } catch (e) { /* ignore */ }
                        return translations;
                    }
                }

                // If rate limited (403) or server error (5xx), throw to trigger bundled fallback
                if (githubResponse.status === 403) {
                    console.warn('🪼 Jellyfin Enhanced: GitHub rate limit detected, using bundled fallback');
                } else if (githubResponse.status >= 500) {
                    console.warn(`🪼 Jellyfin Enhanced: GitHub server error (${githubResponse.status}), using bundled fallback`);
                }

                throw new Error(`GitHub fetch failed with status ${githubResponse.status}`);
            } catch (githubError) {
                console.warn('🪼 Jellyfin Enhanced: GitHub fetch failed, falling back to bundled translations:', githubError.message);
            }

            // Fallback to bundled translations served by the plugin
            console.log(`🪼 Jellyfin Enhanced: Loading bundled translations for ${lang}...`);
            let response = await fetch(ApiClient.getUrl(`/JellyfinEnhanced/locales/${lang}.json`));

            if (response.ok) {
                const translations = await response.json();
                // Cache the bundled version too
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(translations));
                    localStorage.setItem(timestampKey, Date.now().toString());
                } catch (e) { /* ignore */ }
                return translations;
            } else {
                // Last resort: English bundled
                console.warn(`🪼 Jellyfin Enhanced: Bundled ${lang} not found, falling back to bundled English`);
                response = await fetch(ApiClient.getUrl('/JellyfinEnhanced/locales/en.json'));
                if (response.ok) {
                    return await response.json();
                } else {
                    throw new Error("Failed to load English fallback translations");
                }
            }
        } catch (error) {
            console.error('🪼 Jellyfin Enhanced: Failed to load translations:', error);
            return {}; // Return empty object on catastrophic failure
        }
    }

     /**
     * Fetches plugin configuration and version from the server.
     * @returns {Promise<[object, string]>} A promise that resolves with config and version.
     */
     function loadPluginData() {
        const configPromise = ApiClient.ajax({
            type: 'GET',
            url: ApiClient.getUrl('/JellyfinEnhanced/public-config'),
            dataType: 'json'
        }).catch((e) => {
            console.error("🪼 Jellyfin Enhanced: Failed to fetch public config", e);
            return {}; // Return empty object on error
        });

        const versionPromise = ApiClient.ajax({
            type: 'GET',
            url: ApiClient.getUrl('/JellyfinEnhanced/version'),
            dataType: 'text'
        }).catch((e) => {
             console.error("🪼 Jellyfin Enhanced: Failed to fetch version", e);
            return 'unknown'; // Return placeholder on error
        });

        return Promise.all([configPromise, versionPromise]);
    }

    /**
     * Fetches sensitive configuration from the authenticated endpoint.
     * @returns {Promise<void>}
     */
    async function loadPrivateConfig() {
        try {
            const privateConfig = await ApiClient.ajax({
                type: 'GET',
                url: ApiClient.getUrl('/JellyfinEnhanced/private-config'),
                dataType: 'json'
            });
            // Merge the sensitive keys into the main config object
            Object.assign(JE.pluginConfig, privateConfig);
        } catch (error) {
            console.warn('🪼 Jellyfin Enhanced: Could not load private configuration. Some features may be limited.', error);
            // Don't assign anything if it fails
        }
    }


    /**
     * Loads an array of scripts dynamically.
     * @param {string[]} scripts - Array of script filenames.
     * @param {string} basePath - The base URL path for the scripts.
     * @returns {Promise<void>} - A promise that resolves when all scripts attempt to load.
     */
    function loadScripts(scripts, basePath) {
        const promises = scripts.map(scriptName => {
            return new Promise((resolve) => { // Always resolve so one failure doesn't stop others
                const script = document.createElement('script');
                script.src = ApiClient.getUrl(`${basePath}/${scriptName}?v=${Date.now()}`); // Cache-busting
                script.onload = () => {
                    resolve({ status: 'fulfilled', script: scriptName });
                };
                script.onerror = (e) => {
                    console.error(`🪼 Jellyfin Enhanced: Failed to load script '${scriptName}'`, e);
                    resolve({ status: 'rejected', script: scriptName, error: e }); // Resolve even on error
                };
                document.head.appendChild(script);
            });
        });
        // Wait for all promises to settle (either fulfilled or rejected)
        return Promise.allSettled(promises);
    }

    /**
     * Main initialization function.
     */
    async function initialize() {
        // Ensure ApiClient exists and user is logged in
        if (typeof ApiClient === 'undefined' || !ApiClient.getCurrentUserId?.()) {
            setTimeout(initialize, 300);
            return;
        }

        try {
            // Stage 1: Load base configs and translations
            const [[config, version], translations] = await Promise.all([
                loadPluginData(),
                loadTranslations() // Load translations first
            ]);

            JE.pluginConfig = config && typeof config === 'object' ? config : {};
            JE.pluginVersion = version || 'unknown';
            JE.translations = translations || {};
            JE.t = window.JellyfinEnhanced.t; // Ensure the real function is assigned
            await loadPrivateConfig();

            // Stage 2: Fetch user-specific settings
            const userId = ApiClient.getCurrentUserId();

            try {
                const settingsData = await ApiClient.ajax({ 
                    type: 'GET', 
                    url: ApiClient.getUrl(`/JellyfinEnhanced/user-settings/${userId}/settings.json`), 
                    dataType: 'json' 
                });
                JE.userConfig.settings = toCamelCase(settingsData || {});
            } catch (e) {
                JE.userConfig.settings = {};
            }

            // Stage 3: Load core component scripts
            const basePath = '/JellyfinEnhanced/js';
            const coreScripts = [
                'enhanced/helpers.js',
                'enhanced/config.js',
                'enhanced/playback.js',
                'enhanced/events.js'
            ];
            await loadScripts(coreScripts, basePath);
            console.log('🪼 Jellyfin Enhanced: Core scripts loaded.');

            // Stage 4: Initialize settings
            if (typeof JE.loadSettings === 'function') {
                JE.currentSettings = JE.loadSettings();
            } else {
                console.error("🪼 Jellyfin Enhanced: FATAL - config.js functions not defined after script loading.");
                return;
            }

            // Stage 5: Initialize feature
            if (typeof JE.initializeEnhancedScript === 'function') {
                JE.initializeEnhancedScript();
            }

            console.log('🪼 Jellyfin Enhanced: Initialization complete.');

        } catch (error) {
            console.error('🪼 Jellyfin Enhanced: CRITICAL INITIALIZATION FAILURE:', error);
        }
    }

    // Start main initialization
    initialize();

})();
