using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.JellyfinEnhanced.Configuration
{
    public class PluginConfiguration : BasePluginConfiguration
    {
        public PluginConfiguration()
        {
            ToastDuration = 1500;
            HelpPanelAutocloseDelay = 15000;
            LongPress2xEnabled = false;
        }

        public int ToastDuration { get; set; }
        public int HelpPanelAutocloseDelay { get; set; }
        public bool LongPress2xEnabled { get; set; }
    }
}