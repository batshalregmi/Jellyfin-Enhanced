using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Jellyfin.Plugin.JellyfinEnhanced.Configuration;

namespace Jellyfin.Plugin.JellyfinEnhanced.Controllers
{
    [Route("JellyfinEnhanced")]
    [ApiController]
    public class JellyfinEnhancedController : ControllerBase
    {
        private readonly Logger _logger;
        private readonly UserConfigurationManager _userConfigurationManager;

        public JellyfinEnhancedController(Logger logger, UserConfigurationManager userConfigurationManager)
        {
            _logger = logger;
            _userConfigurationManager = userConfigurationManager;
        }

        [HttpGet("script")]
        public ActionResult GetMainScript() => GetScriptResource("js/plugin.js");

        [HttpGet("js/{**path}")]
        public ActionResult GetScript(string path) => GetScriptResource($"js/{path}");

        [HttpGet("version")]
        public ActionResult GetVersion() => Content(JellyfinEnhanced.Instance?.Version.ToString() ?? "unknown");

        [HttpGet("private-config")]
        [Authorize]
        public ActionResult GetPrivateConfig()
        {
            var config = JellyfinEnhanced.Instance?.Configuration;
            if (config == null)
            {
                return StatusCode(503);
            }

            return new JsonResult(new { });
        }

        [HttpGet("public-config")]
        public ActionResult GetPublicConfig()
        {
            var config = JellyfinEnhanced.Instance?.Configuration;
            if (config == null)
            {
                return StatusCode(503);
            }

            return new JsonResult(new
            {
                config.ToastDuration,
                config.HelpPanelAutocloseDelay,
                config.LongPress2xEnabled
            });
        }

        [HttpGet("locales/{lang}.json")]
        public ActionResult GetLocale(string lang)
        {
            var sanitizedLang = Path.GetFileName(lang);
            var resourcePath = $"Jellyfin.Plugin.JellyfinEnhanced.js.locales.{sanitizedLang}.json";
            var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourcePath);

            if (stream == null)
            {
                _logger.Warning($"Locale file not found for language: {sanitizedLang}");
                return NotFound();
            }

            return new FileStreamResult(stream, "application/json");
        }

        private ActionResult GetScriptResource(string resourcePath)
        {
            var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"Jellyfin.Plugin.JellyfinEnhanced.{resourcePath.Replace('/', '.')}");
            return stream == null ? NotFound() : new FileStreamResult(stream, "application/javascript");
        }

        [HttpGet("user-settings/{userId}/settings.json")]
        [Authorize]
        public IActionResult GetUserSettingsSettings(string userId)
        {
            if (!_userConfigurationManager.UserConfigurationExists(userId, "settings.json"))
            {
                var defaultConfig = JellyfinEnhanced.Instance?.Configuration;
                if (defaultConfig != null)
                {
                    var defaultUserSettings = new UserSettings
                    {
                        LongPress2xEnabled = defaultConfig.LongPress2xEnabled
                    };

                    _userConfigurationManager.SaveUserConfiguration(userId, "settings.json", defaultUserSettings);
                    _logger.Info($"Saved default settings.json for new user {userId} from plugin configuration.");
                }
            }

            var userConfig = _userConfigurationManager.GetUserConfiguration<UserSettings>(userId, "settings.json");
            return Ok(userConfig);
        }

        [HttpPost("user-settings/{userId}/settings.json")]
        [Authorize]
        [Produces("application/json")]
        public IActionResult SaveUserSettingsSettings(string userId, [FromBody] UserSettings userConfiguration)
        {
            try
            {
                _userConfigurationManager.SaveUserConfiguration(userId, "settings.json", userConfiguration);
                _logger.Info($"Saved user settings for user {userId} to settings.json");
                return Ok(new { success = true, file = "settings.json" });
            }
            catch (Exception ex)
            {
                _logger.Error($"Failed to save user settings for user {userId}: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Failed to save user settings." });
            }
        }
    }
}
