using System.IO;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ShishaPointPrinterTray;

public sealed class WorkerSnapshot
{
    public bool IsRunning { get; init; }
    public bool HasLock { get; init; }
    public string StatusText { get; init; } = "Stopped";
    public string? LastError { get; init; }
    public string? PrinterEndpoint { get; init; }
    public string? LockHolder { get; init; }
    public DateTimeOffset? LockExpiresAt { get; init; }
    public DateTimeOffset? LastHeartbeatAt { get; init; }
}

public sealed class PrinterWorkerService : IDisposable
{
    private static readonly TimeSpan SettingsRefreshInterval = TimeSpan.FromSeconds(30);
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly object _sync = new();
    private readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(20) };

    private CancellationTokenSource? _cts;
    private Task? _loopTask;
    private string? _jwtToken;
    private string? _lockToken;
    private WorkerSettings? _activeSettings;
    private PrinterSettingsResponse? _settings;
    private DateTimeOffset _lastSettingsAt = DateTimeOffset.MinValue;
    private DateTimeOffset _lastIdleLoggedAt = DateTimeOffset.MinValue;

    private bool _isRunning;
    private bool _hasLock;
    private string _statusText = "Stopped";
    private string? _lastError;
    private string? _printerEndpoint;
    private string? _lockHolder;
    private DateTimeOffset? _lockExpiresAt;
    private DateTimeOffset? _lastHeartbeatAt;

    public event EventHandler<string>? LogReceived;
    public event EventHandler? SnapshotChanged;

    public WorkerSnapshot Snapshot
    {
        get
        {
            lock (_sync)
            {
                return BuildSnapshot();
            }
        }
    }

    public bool IsRunning
    {
        get
        {
            lock (_sync)
            {
                return _isRunning;
            }
        }
    }

    public void Start(WorkerSettings settings)
    {
        lock (_sync)
        {
            if (_isRunning)
            {
                return;
            }

            _cts = new CancellationTokenSource();
            _isRunning = true;
            _statusText = "Starting...";
            _lastError = null;
            _loopTask = Task.Run(() => RunAsync(settings.Clone(), _cts.Token));
        }

        PublishSnapshot();
    }

    public async Task StopAsync()
    {
        Task? task;
        CancellationTokenSource? cts;

        lock (_sync)
        {
            task = _loopTask;
            cts = _cts;
            if (task is null || !_isRunning)
            {
                return;
            }
            _statusText = "Stopping...";
        }

        PublishSnapshot();
        cts?.Cancel();

        if (task is not null)
        {
            try
            {
                await task.ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                // Normal shutdown path.
            }
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
        _cts?.Dispose();
    }

    private async Task RunAsync(WorkerSettings settings, CancellationToken cancellationToken)
    {
        settings.Normalize();
        _activeSettings = settings.Clone();
        _lockToken = await LoadOrCreateLockTokenAsync(settings.LockFilePath, cancellationToken).ConfigureAwait(false);
        Log($"Worker starting for {settings.BaseUrl} as {settings.Username}.");
        Log($"Using lock file: {settings.LockFilePath}");

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(_jwtToken))
                    {
                        await LoginAsync(settings, cancellationToken).ConfigureAwait(false);
                    }

                    await RunCycleAsync(settings, cancellationToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    break;
                }
                catch (ApiException error) when (error.StatusCode == 401)
                {
                    _jwtToken = null;
                    UpdateState(statusText: "Reconnecting...", clearError: true);
                    Log("Authentication expired. Reconnecting...");
                }
                catch (ApiException error) when (IsLockError(error))
                {
                    UpdateState(hasLock: false, statusText: "Waiting for printer lock", lastError: error.Message);
                    Log($"Lock error: {error.Message}");
                }
                catch (Exception error)
                {
                    UpdateState(statusText: "Worker error", lastError: error.Message);
                    Log($"Worker error: {error.Message}");
                }

                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                var delayMs = Math.Max(1000, _settings?.PollIntervalMs ?? settings.PollMs);
                await Task.Delay(delayMs, cancellationToken).ConfigureAwait(false);
            }
        }
        finally
        {
            await ReleaseLockAsync("shutdown").ConfigureAwait(false);

            lock (_sync)
            {
                _isRunning = false;
                _cts?.Dispose();
                _cts = null;
                _loopTask = null;
                _statusText = "Stopped";
            }

            PublishSnapshot();
            Log("Worker stopped.");
        }
    }

    private async Task RunCycleAsync(WorkerSettings settings, CancellationToken cancellationToken)
    {
        var currentSettings = await RefreshSettingsAsync(settings, force: false, cancellationToken).ConfigureAwait(false);
        if (currentSettings is null || currentSettings.Enabled != 1 || string.IsNullOrWhiteSpace(currentSettings.PrinterIp))
        {
            await ReleaseLockAsync("printer disabled").ConfigureAwait(false);
            UpdateState(
                statusText: "Printer disabled or IP missing",
                lastError: currentSettings?.LastError,
                printerEndpoint: null,
                updatePrinterEndpoint: true,
                lockHolder: currentSettings?.LockHolder,
                updateLockHolder: true,
                lockExpiresAt: FromUnixMs(currentSettings?.LockExpiresAt),
                updateLockExpiresAt: true,
                lastHeartbeatAt: FromUnixMs(currentSettings?.LastSeenAt));
            return;
        }

        UpdateState(
            statusText: _hasLock ? "Polling..." : "Acquiring printer lock...",
            clearError: true,
            printerEndpoint: $"{currentSettings.PrinterIp}:{currentSettings.PrinterPort}",
            updatePrinterEndpoint: true,
            lockHolder: currentSettings.LockHolder,
            updateLockHolder: true,
            lockExpiresAt: FromUnixMs(currentSettings.LockExpiresAt),
            updateLockExpiresAt: true,
            lastHeartbeatAt: FromUnixMs(currentSettings.LastSeenAt));

        if (!_hasLock)
        {
            var acquired = await TryAcquireLockAsync(settings, cancellationToken).ConfigureAwait(false);
            if (!acquired)
            {
                return;
            }
        }

        var claim = await ApiRequestAsync<ClaimNextResponse>(
            HttpMethod.Post,
            "/api/printer/claim-next",
            new { lockToken = _lockToken },
            settings,
            cancellationToken).ConfigureAwait(false);

        if (claim?.Status == "job" && claim.Job is not null)
        {
            await HandleJobAsync(claim.Job, settings, cancellationToken).ConfigureAwait(false);
            return;
        }

        if (claim?.Status == "idle")
        {
            await SendHeartbeatAsync("idle", null, settings).ConfigureAwait(false);
            UpdateState(statusText: "Waiting for jobs...", clearError: true);

            if (DateTimeOffset.UtcNow - _lastIdleLoggedAt > TimeSpan.FromSeconds(15))
            {
                Log("Waiting for print jobs...");
                _lastIdleLoggedAt = DateTimeOffset.UtcNow;
            }

            return;
        }

        throw new InvalidOperationException(claim?.Message ?? "Unknown claim-next response");
    }

    private async Task HandleJobAsync(ClaimedJob job, WorkerSettings settings, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(job.PrinterIp) || job.PrinterPort <= 0 || string.IsNullOrWhiteSpace(job.Receipt))
        {
            throw new InvalidOperationException("Claimed job payload is incomplete.");
        }

        var printerEndpoint = $"{job.PrinterIp}:{job.PrinterPort}";
        UpdateState(statusText: $"Printing order {job.OrderId}...", clearError: true, printerEndpoint: printerEndpoint, updatePrinterEndpoint: true);
        Log($"Printing order {job.OrderId} (job {job.Id}) to {printerEndpoint}...");

        try
        {
            await SendToNetworkPrinterAsync(job.PrinterIp, job.PrinterPort, job.Receipt, cancellationToken).ConfigureAwait(false);
            await ExportEcrFilesIfNeededAsync(job, settings).ConfigureAwait(false);
            await ApiRequestAsync<CompletionResponse>(
                HttpMethod.Post,
                $"/api/printer/jobs/{job.Id}/complete",
                new { lockToken = _lockToken },
                settings,
                cancellationToken).ConfigureAwait(false);

            await SendHeartbeatAsync("printed", null, settings).ConfigureAwait(false);
            UpdateState(statusText: $"Printed job #{job.Id}", clearError: true, printerEndpoint: printerEndpoint, updatePrinterEndpoint: true);
            Log($"Printed order {job.OrderId} (job {job.Id}).");
        }
        catch (Exception error)
        {
            var message = error.Message;
            try
            {
                await ApiRequestAsync<CompletionResponse>(
                    HttpMethod.Post,
                    $"/api/printer/jobs/{job.Id}/fail",
                    new { lockToken = _lockToken, errorMessage = message },
                    settings,
                    cancellationToken).ConfigureAwait(false);
            }
            catch (Exception reportError)
            {
                Log($"Could not report failed job {job.Id}: {reportError.Message}");
            }

            await SendHeartbeatAsync("error", message, settings).ConfigureAwait(false);
            UpdateState(statusText: $"Print failed for job #{job.Id}", lastError: message, printerEndpoint: printerEndpoint, updatePrinterEndpoint: true);
            Log($"Print failed for job {job.Id}: {message}");
        }
    }

    private Task ExportEcrFilesIfNeededAsync(ClaimedJob job, WorkerSettings settings)
    {
        try
        {
            var result = EcrTxtExporter.TryExportPaidCardOrder(settings, job.EcrPayload);
            if (result.Exported)
            {
                foreach (var filePath in result.WrittenFiles)
                {
                    Log($"ECR file written: {filePath}");
                }

                Log($"ECR export completed for order {job.OrderId}.");
                return Task.CompletedTask;
            }

            if (!string.IsNullOrWhiteSpace(result.SkippedReason) && settings.EcrExportEnabled)
            {
                Log($"ECR export skipped for order {job.OrderId}: {result.SkippedReason}");
            }
        }
        catch (Exception error)
        {
            Log($"ECR export failed for order {job.OrderId}: {error.Message}");
        }

        return Task.CompletedTask;
    }

    private async Task LoginAsync(WorkerSettings settings, CancellationToken cancellationToken)
    {
        var response = await ApiRequestAsync<LoginResponse>(
            HttpMethod.Post,
            "/api/auth/login",
            new { username = settings.Username, password = settings.Password },
            settings,
            cancellationToken,
            allowRelogin: false,
            includeToken: false).ConfigureAwait(false);

        if (string.IsNullOrWhiteSpace(response?.Token))
        {
            throw new InvalidOperationException("Login succeeded without a token.");
        }

        _jwtToken = response.Token;
        UpdateState(statusText: $"Logged in as {response.User?.Username ?? settings.Username}", clearError: true);
        Log($"Logged in as {response.User?.Username ?? settings.Username}.");
    }

    private async Task<bool> TryAcquireLockAsync(WorkerSettings settings, CancellationToken cancellationToken)
    {
        try
        {
            var holder = $"{settings.Username}@{Environment.MachineName}:tray";
            var response = await ApiRequestAsync<AcquireLockResponse>(
                HttpMethod.Post,
                "/api/printer/lock/acquire",
                new
                {
                    lockToken = _lockToken,
                    holder,
                    leaseMs = settings.LeaseMs,
                },
                settings,
                cancellationToken).ConfigureAwait(false);

            UpdateState(
                hasLock: true,
                statusText: "Printer lock acquired",
                clearError: true,
                lockHolder: response?.LockHolder ?? holder,
                updateLockHolder: true,
                lockExpiresAt: FromUnixMs(response?.LockExpiresAt),
                updateLockExpiresAt: true);
            Log($"Printer lock acquired as {response?.LockHolder ?? holder}.");
            return true;
        }
        catch (ApiException error) when (error.StatusCode == 409)
        {
            var holder = error.ErrorBody?.LockHolder ?? "another client";
            UpdateState(
                hasLock: false,
                statusText: "Waiting for printer lock",
                lastError: error.Message,
                lockHolder: holder,
                updateLockHolder: true,
                lockExpiresAt: FromUnixMs(error.ErrorBody?.LockExpiresAt),
                updateLockExpiresAt: true);
            Log($"Printer lock busy: {holder}.");
            return false;
        }
    }

    private async Task<PrinterSettingsResponse?> RefreshSettingsAsync(
        WorkerSettings settings,
        bool force,
        CancellationToken cancellationToken)
    {
        if (!force && _settings is not null && DateTimeOffset.UtcNow - _lastSettingsAt < SettingsRefreshInterval)
        {
            return _settings;
        }

        var response = await ApiRequestAsync<PrinterSettingsResponse>(
            HttpMethod.Get,
            "/api/printer/settings",
            null,
            settings,
            cancellationToken).ConfigureAwait(false);

        _settings = response;
        _lastSettingsAt = DateTimeOffset.UtcNow;
        UpdateState(
            printerEndpoint: response is null || string.IsNullOrWhiteSpace(response.PrinterIp)
                ? null
                : $"{response.PrinterIp}:{response.PrinterPort}",
            updatePrinterEndpoint: true,
            lockHolder: response?.LockHolder,
            updateLockHolder: true,
            lockExpiresAt: FromUnixMs(response?.LockExpiresAt),
            updateLockExpiresAt: true,
            lastHeartbeatAt: FromUnixMs(response?.LastSeenAt));
        return response;
    }

    private async Task SendHeartbeatAsync(string status, string? errorMessage, WorkerSettings settings)
    {
        if (!_hasLock)
        {
            return;
        }

        try
        {
            var response = await ApiRequestAsync<PrinterSettingsResponse>(
                HttpMethod.Post,
                "/api/printer/heartbeat",
                new
                {
                    status,
                    errorMessage,
                    lockToken = _lockToken,
                },
                settings,
                CancellationToken.None).ConfigureAwait(false);

            _settings = response;
            _lastSettingsAt = DateTimeOffset.UtcNow;
            UpdateState(
                statusText: status == "idle" ? "Waiting for jobs..." : _statusText,
                lastHeartbeatAt: FromUnixMs(response?.LastSeenAt),
                printerEndpoint: response is null || string.IsNullOrWhiteSpace(response.PrinterIp)
                    ? _printerEndpoint
                    : $"{response.PrinterIp}:{response.PrinterPort}",
                updatePrinterEndpoint: true,
                lockHolder: response?.LockHolder,
                updateLockHolder: true,
                lockExpiresAt: FromUnixMs(response?.LockExpiresAt),
                updateLockExpiresAt: true);
        }
        catch (ApiException error) when (IsLockError(error))
        {
            UpdateState(hasLock: false, statusText: "Lock expired", lastError: error.Message);
            Log("Printer lock expired while sending heartbeat.");
        }
    }

    private async Task ReleaseLockAsync(string reason)
    {
        if (!_hasLock || string.IsNullOrWhiteSpace(_lockToken))
        {
            return;
        }

        try
        {
            var releaseSettings = _activeSettings ?? new WorkerSettings();
            releaseSettings.Normalize();
            await ApiRequestAsync<ReleaseLockResponse>(
                HttpMethod.Post,
                "/api/printer/lock/release",
                new { lockToken = _lockToken },
                releaseSettings,
                CancellationToken.None,
                allowRelogin: false).ConfigureAwait(false);
            Log($"Printer lock released ({reason}).");
        }
        catch (Exception error)
        {
            Log($"Failed to release printer lock: {error.Message}");
        }
        finally
        {
            UpdateState(hasLock: false, lockHolder: null, updateLockHolder: true, lockExpiresAt: null, updateLockExpiresAt: true);
        }
    }

    private async Task<T?> ApiRequestAsync<T>(
        HttpMethod method,
        string route,
        object? payload,
        WorkerSettings settings,
        CancellationToken cancellationToken,
        bool allowRelogin = true,
        bool includeToken = true)
    {
        using var request = new HttpRequestMessage(method, $"{settings.BaseUrl}{route}");
        if (includeToken && !string.IsNullOrWhiteSpace(_jwtToken))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _jwtToken);
        }

        if (payload is not null)
        {
            request.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken).ConfigureAwait(false);
        var text = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && allowRelogin && includeToken)
        {
            _jwtToken = null;
            await LoginAsync(settings, cancellationToken).ConfigureAwait(false);
            return await ApiRequestAsync<T>(
                method,
                route,
                payload,
                settings,
                cancellationToken,
                allowRelogin: false,
                includeToken: includeToken).ConfigureAwait(false);
        }

        if (!response.IsSuccessStatusCode)
        {
            ApiErrorBody? errorBody = null;
            try
            {
                errorBody = JsonSerializer.Deserialize<ApiErrorBody>(text, JsonOptions);
            }
            catch
            {
                errorBody = null;
            }

            var message = errorBody?.Message;
            if (string.IsNullOrWhiteSpace(message))
            {
                message = string.IsNullOrWhiteSpace(text) ? $"{(int)response.StatusCode} {response.ReasonPhrase}" : text;
            }

            throw new ApiException((int)response.StatusCode, message!, errorBody);
        }

        if (string.IsNullOrWhiteSpace(text))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(text, JsonOptions);
    }

    private static async Task<string> LoadOrCreateLockTokenAsync(string lockFilePath, CancellationToken cancellationToken)
    {
        var normalizedPath = string.IsNullOrWhiteSpace(lockFilePath) ? WorkerSettings.DefaultLockFilePath : lockFilePath;
        var directory = Path.GetDirectoryName(normalizedPath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        try
        {
            if (File.Exists(normalizedPath))
            {
                var text = await File.ReadAllTextAsync(normalizedPath, cancellationToken).ConfigureAwait(false);
                var existing = JsonSerializer.Deserialize<LockTokenFile>(text, JsonOptions);
                if (!string.IsNullOrWhiteSpace(existing?.LockToken))
                {
                    return existing.LockToken;
                }
            }
        }
        catch
        {
            // Fall through and create a fresh token.
        }

        var lockToken = Guid.NewGuid().ToString();
        var payload = JsonSerializer.Serialize(new LockTokenFile(lockToken), JsonOptions);
        await File.WriteAllTextAsync(normalizedPath, payload, cancellationToken).ConfigureAwait(false);
        return lockToken;
    }

    private static async Task SendToNetworkPrinterAsync(string host, int port, string content, CancellationToken cancellationToken)
    {
        using var client = new TcpClient();
        await client.ConnectAsync(host, port, cancellationToken).ConfigureAwait(false);
        await using var stream = client.GetStream();
        stream.WriteTimeout = 7000;
        stream.ReadTimeout = 7000;

        var receiptBytes = Encoding.Latin1.GetBytes(content);
        var feedCommand = new byte[] { 0x1B, 0x64, 0x05 };
        var cutCommand = new byte[] { 0x1D, 0x56, 0x00 };

        await stream.WriteAsync(receiptBytes, cancellationToken).ConfigureAwait(false);
        await stream.WriteAsync(feedCommand, cancellationToken).ConfigureAwait(false);
        await stream.WriteAsync(cutCommand, cancellationToken).ConfigureAwait(false);
        await stream.FlushAsync(cancellationToken).ConfigureAwait(false);
    }

    private static bool IsLockError(ApiException error)
        => error.StatusCode == 409 || error.Message.Contains("lock", StringComparison.OrdinalIgnoreCase);

    private static DateTimeOffset? FromUnixMs(long? unixMs)
        => unixMs.HasValue && unixMs.Value > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(unixMs.Value) : null;

    private void Log(string message)
    {
        LogReceived?.Invoke(this, $"[{DateTime.Now:HH:mm:ss}] {message}");
    }

    private void UpdateState(
        bool? isRunning = null,
        bool? hasLock = null,
        string? statusText = null,
        string? lastError = null,
        bool clearError = false,
        string? printerEndpoint = null,
        bool updatePrinterEndpoint = false,
        string? lockHolder = null,
        bool updateLockHolder = false,
        DateTimeOffset? lockExpiresAt = null,
        bool updateLockExpiresAt = false,
        DateTimeOffset? lastHeartbeatAt = null)
    {
        lock (_sync)
        {
            if (isRunning.HasValue) _isRunning = isRunning.Value;
            if (hasLock.HasValue) _hasLock = hasLock.Value;
            if (statusText is not null) _statusText = statusText;
            if (clearError) _lastError = null;
            if (lastError is not null) _lastError = lastError;
            if (updatePrinterEndpoint) _printerEndpoint = printerEndpoint;
            if (updateLockHolder) _lockHolder = lockHolder;
            if (updateLockExpiresAt) _lockExpiresAt = lockExpiresAt;
            if (lastHeartbeatAt.HasValue) _lastHeartbeatAt = lastHeartbeatAt;
        }

        PublishSnapshot();
    }

    private void PublishSnapshot() => SnapshotChanged?.Invoke(this, EventArgs.Empty);

    private WorkerSnapshot BuildSnapshot() =>
        new()
        {
            IsRunning = _isRunning,
            HasLock = _hasLock,
            StatusText = _statusText,
            LastError = _lastError,
            PrinterEndpoint = _printerEndpoint,
            LockHolder = _lockHolder,
            LockExpiresAt = _lockExpiresAt,
            LastHeartbeatAt = _lastHeartbeatAt,
        };

    private sealed record LoginResponse(string? Message, LoginUser? User, string? Token);
    private sealed record LoginUser(string? Username, string? Role);
    private sealed record AcquireLockResponse(string? Status, string? LockHolder, long? LockExpiresAt);
    private sealed record ReleaseLockResponse(string? Status);
    private sealed record CompletionResponse(string? Status, int JobId, int OrderId);
    private sealed record ClaimNextResponse(string? Status, string? Message, ClaimedJob? Job);
    private sealed record ClaimedJob(int Id, int OrderId, string? PrinterIp, int PrinterPort, string? Receipt, EcrJobPayload? EcrPayload);
    private sealed record PrinterSettingsResponse(
        int Id,
        int Enabled,
        string? PrinterIp,
        int PrinterPort,
        int PollIntervalMs,
        string? LastStatus,
        string? LastError,
        string? LockHolder,
        long? LockExpiresAt,
        long? LastSeenAt);
    private sealed record LockTokenFile(string LockToken);

    private sealed record ApiErrorBody
    {
        public string? Message { get; init; }
        public string? LockHolder { get; init; }
        public long? LockExpiresAt { get; init; }
    }

    private sealed class ApiException : Exception
    {
        public ApiException(int statusCode, string message, ApiErrorBody? errorBody) : base(message)
        {
            StatusCode = statusCode;
            ErrorBody = errorBody;
        }

        public int StatusCode { get; }
        public ApiErrorBody? ErrorBody { get; }
    }
}
