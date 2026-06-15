using System.IO;
using System.Text.Json;

namespace ShishaPointPrinterTray;

public static class WorkerSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true,
    };

    public static WorkerSettings Load(string? settingsPath = null)
    {
        var path = string.IsNullOrWhiteSpace(settingsPath) ? WorkerSettings.DefaultSettingsPath : settingsPath;

        try
        {
            if (!File.Exists(path))
            {
                var fallback = new WorkerSettings();
                fallback.Normalize();
                return fallback;
            }

            var json = File.ReadAllText(path);
            var settings = JsonSerializer.Deserialize<WorkerSettings>(json, JsonOptions) ?? new WorkerSettings();
            settings.Normalize();
            return settings;
        }
        catch
        {
            var fallback = new WorkerSettings();
            fallback.Normalize();
            return fallback;
        }
    }

    public static void Save(WorkerSettings settings, string? settingsPath = null)
    {
        var path = string.IsNullOrWhiteSpace(settingsPath) ? WorkerSettings.DefaultSettingsPath : settingsPath;
        var normalized = settings.Clone();
        normalized.Normalize();

        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        File.WriteAllText(path, JsonSerializer.Serialize(normalized, JsonOptions));
    }
}
