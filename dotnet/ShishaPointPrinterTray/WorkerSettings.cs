using System.IO;

namespace ShishaPointPrinterTray;

public sealed class WorkerSettings
{
    public const string DefaultBaseUrl = "http://www.shishapoint.site";
    public const string DefaultUsername = "printer";
    public const string DefaultPassword = "printer123";
    public const int DefaultPollMs = 3000;
    public const int DefaultLeaseMs = 15000;

    public static string AppDataDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DigitalMenuBuilder");

    public static string DefaultSettingsPath => Path.Combine(AppDataDirectory, "printer-tray-settings.json");
    public static string DefaultLockFilePath => Path.Combine(AppDataDirectory, "printer-worker-lock.json");
    public static string DefaultEcrExportDirectory => @"C:\ecr\";

    public string BaseUrl { get; set; } = DefaultBaseUrl;
    public string Username { get; set; } = DefaultUsername;
    public string Password { get; set; } = DefaultPassword;
    public int PollMs { get; set; } = DefaultPollMs;
    public int LeaseMs { get; set; } = DefaultLeaseMs;
    public bool AutoStart { get; set; }
    public string LockFilePath { get; set; } = DefaultLockFilePath;
    public bool EcrExportEnabled { get; set; }
    public string EcrExportDirectory { get; set; } = DefaultEcrExportDirectory;
    public string EcrDefaultVat { get; set; } = "B";
    public int EcrCardTerminal { get; set; } = 2;

    public WorkerSettings Clone() =>
        new()
        {
            BaseUrl = BaseUrl,
            Username = Username,
            Password = Password,
            PollMs = PollMs,
            LeaseMs = LeaseMs,
            AutoStart = AutoStart,
            LockFilePath = LockFilePath,
            EcrExportEnabled = EcrExportEnabled,
            EcrExportDirectory = EcrExportDirectory,
            EcrDefaultVat = EcrDefaultVat,
            EcrCardTerminal = EcrCardTerminal,
        };

    public void Normalize()
    {
        BaseUrl = string.IsNullOrWhiteSpace(BaseUrl) ? DefaultBaseUrl : BaseUrl.Trim().TrimEnd('/');
        Username = string.IsNullOrWhiteSpace(Username) ? DefaultUsername : Username.Trim();
        Password = string.IsNullOrWhiteSpace(Password) ? DefaultPassword : Password.Trim();
        PollMs = Math.Max(1000, PollMs);
        LeaseMs = Math.Max(5000, LeaseMs);
        LockFilePath = string.IsNullOrWhiteSpace(LockFilePath) ? DefaultLockFilePath : LockFilePath.Trim();
        EcrExportDirectory = string.IsNullOrWhiteSpace(EcrExportDirectory)
            ? DefaultEcrExportDirectory
            : EcrExportDirectory.Trim();
        EcrDefaultVat = string.IsNullOrWhiteSpace(EcrDefaultVat) ? "B" : EcrDefaultVat.Trim().ToUpperInvariant();
        EcrCardTerminal = Math.Max(1, EcrCardTerminal);
    }
}
