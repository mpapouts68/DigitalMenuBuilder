using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace ShishaPointPrinterTray;

public sealed class MainForm : Form
{
    private readonly PrinterWorkerService _worker = new();
    private readonly NotifyIcon _notifyIcon = new();
    private readonly ContextMenuStrip _trayMenu = new();
    private readonly System.Windows.Forms.Timer _uiTimer = new() { Interval = 1000 };
    private readonly Icon _runningIcon;
    private readonly Icon _stoppedIcon;

    private WorkerSettings _settings = WorkerSettingsStore.Load();
    private bool _allowExit;

    private TextBox _baseUrlTextBox = null!;
    private TextBox _usernameTextBox = null!;
    private TextBox _passwordTextBox = null!;
    private TextBox _lockFileTextBox = null!;
    private NumericUpDown _pollMsInput = null!;
    private NumericUpDown _leaseMsInput = null!;
    private CheckBox _autoStartCheckBox = null!;
    private CheckBox _ecrExportEnabledCheckBox = null!;
    private TextBox _ecrExportDirectoryTextBox = null!;
    private TextBox _ecrDefaultVatTextBox = null!;
    private NumericUpDown _ecrCardTerminalInput = null!;
    private TextBox _logTextBox = null!;
    private Label _workerStatusLabel = null!;
    private Label _printerLabel = null!;
    private Label _lockLabel = null!;
    private Label _heartbeatLabel = null!;
    private Label _errorLabel = null!;
    private Label _settingsPathLabel = null!;
    private Button _startButton = null!;
    private Button _stopButton = null!;

    public MainForm()
    {
        _settings.Normalize();
        _runningIcon = CreateStatusIcon(Color.FromArgb(34, 197, 94));
        _stoppedIcon = CreateStatusIcon(Color.FromArgb(220, 38, 38));

        Text = "ShishaPoint Printer Tray";
        MinimumSize = new Size(860, 620);
        StartPosition = FormStartPosition.CenterScreen;
        Icon = _stoppedIcon;

        BuildUi();
        ApplySettingsToControls(_settings);
        InitializeTray();

        _worker.LogReceived += (_, entry) => PostToUi(() => AppendLog(entry));
        _worker.SnapshotChanged += (_, _) => PostToUi(RefreshSnapshot);

        _uiTimer.Tick += (_, _) => RefreshSnapshot();
        _uiTimer.Start();

        Load += MainForm_Load;
        Resize += MainForm_Resize;
        FormClosing += MainForm_FormClosing;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _uiTimer.Dispose();
            _notifyIcon.Dispose();
            _trayMenu.Dispose();
            _worker.Dispose();
            _runningIcon.Dispose();
            _stoppedIcon.Dispose();
        }

        base.Dispose(disposing);
    }

    private async void MainForm_Load(object? sender, EventArgs e)
    {
        AppendLog("Tray app ready.");
        AppendLog($"Settings file: {WorkerSettings.DefaultSettingsPath}");

        if (_settings.AutoStart)
        {
            AppendLog("Auto-start enabled. Starting worker...");
            await StartWorkerAsync().ConfigureAwait(true);
        }

        RefreshSnapshot();
    }

    private void BuildUi()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 6,
            Padding = new Padding(12),
        };
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        var introLabel = new Label
        {
            AutoSize = true,
            Dock = DockStyle.Fill,
            Text =
                "Standalone Windows tray app for the ShishaPoint printer queue. It logs into Hostman directly, claims jobs, prints over LAN, and reports status back to the server.",
        };
        root.Controls.Add(introLabel, 0, 0);

        var buttonPanel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = true,
            Padding = new Padding(0, 8, 0, 8),
        };

        _startButton = new Button { Text = "Start Worker", AutoSize = true };
        _startButton.Click += async (_, _) => await StartWorkerAsync().ConfigureAwait(true);
        buttonPanel.Controls.Add(_startButton);

        _stopButton = new Button { Text = "Stop Worker", AutoSize = true };
        _stopButton.Click += async (_, _) => await StopWorkerAsync().ConfigureAwait(true);
        buttonPanel.Controls.Add(_stopButton);

        var saveButton = new Button { Text = "Save Settings", AutoSize = true };
        saveButton.Click += (_, _) => SaveSettings(showToast: true);
        buttonPanel.Controls.Add(saveButton);

        var hideButton = new Button { Text = "Hide To Tray", AutoSize = true };
        hideButton.Click += (_, _) => HideToTray();
        buttonPanel.Controls.Add(hideButton);

        root.Controls.Add(buttonPanel, 0, 1);

        var settingsGroup = new GroupBox
        {
            Text = "Worker Settings",
            Dock = DockStyle.Fill,
            AutoSize = true,
        };
        var settingsTable = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            ColumnCount = 2,
            Padding = new Padding(8),
        };
        settingsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180));
        settingsTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        settingsTable.Controls.Add(CreateLabel("Base URL"), 0, 0);
        _baseUrlTextBox = new TextBox { Dock = DockStyle.Fill };
        settingsTable.Controls.Add(_baseUrlTextBox, 1, 0);

        settingsTable.Controls.Add(CreateLabel("Printer Username"), 0, 1);
        _usernameTextBox = new TextBox { Dock = DockStyle.Fill };
        settingsTable.Controls.Add(_usernameTextBox, 1, 1);

        settingsTable.Controls.Add(CreateLabel("Printer Password"), 0, 2);
        _passwordTextBox = new TextBox { Dock = DockStyle.Fill, UseSystemPasswordChar = true };
        settingsTable.Controls.Add(_passwordTextBox, 1, 2);

        settingsTable.Controls.Add(CreateLabel("Fallback Poll (ms)"), 0, 3);
        _pollMsInput = new NumericUpDown
        {
            Dock = DockStyle.Left,
            Minimum = 1000,
            Maximum = 60000,
            Increment = 500,
            Width = 140,
        };
        settingsTable.Controls.Add(_pollMsInput, 1, 3);

        settingsTable.Controls.Add(CreateLabel("Lock Lease (ms)"), 0, 4);
        _leaseMsInput = new NumericUpDown
        {
            Dock = DockStyle.Left,
            Minimum = 5000,
            Maximum = 120000,
            Increment = 1000,
            Width = 140,
        };
        settingsTable.Controls.Add(_leaseMsInput, 1, 4);

        settingsTable.Controls.Add(CreateLabel("Lock Token File"), 0, 5);
        _lockFileTextBox = new TextBox { Dock = DockStyle.Fill };
        settingsTable.Controls.Add(_lockFileTextBox, 1, 5);

        settingsTable.Controls.Add(CreateLabel("Auto-start"), 0, 6);
        _autoStartCheckBox = new CheckBox
        {
            AutoSize = true,
            Text = "Start polling automatically when the tray app opens",
        };
        settingsTable.Controls.Add(_autoStartCheckBox, 1, 6);

        _settingsPathLabel = new Label
        {
            AutoSize = true,
            Dock = DockStyle.Fill,
            ForeColor = SystemColors.GrayText,
            Text = $"Saved to: {WorkerSettings.DefaultSettingsPath}",
        };
        settingsTable.Controls.Add(_settingsPathLabel, 0, 7);
        settingsTable.SetColumnSpan(_settingsPathLabel, 2);

        settingsGroup.Controls.Add(settingsTable);
        root.Controls.Add(settingsGroup, 0, 2);

        var ecrGroup = new GroupBox
        {
            Text = "ECR Export (App/Card Orders)",
            Dock = DockStyle.Fill,
            AutoSize = true,
        };
        var ecrTable = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            ColumnCount = 2,
            Padding = new Padding(8),
        };
        ecrTable.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180));
        ecrTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        ecrTable.Controls.Add(CreateLabel("Enable ECR export"), 0, 0);
        _ecrExportEnabledCheckBox = new CheckBox
        {
            AutoSize = true,
            Text = "Write Ftext TXT files when app/card-paid orders print",
        };
        ecrTable.Controls.Add(_ecrExportEnabledCheckBox, 1, 0);

        ecrTable.Controls.Add(CreateLabel("Export directory"), 0, 1);
        _ecrExportDirectoryTextBox = new TextBox { Dock = DockStyle.Fill };
        ecrTable.Controls.Add(_ecrExportDirectoryTextBox, 1, 1);

        ecrTable.Controls.Add(CreateLabel("Default VAT code"), 0, 2);
        _ecrDefaultVatTextBox = new TextBox { Dock = DockStyle.Fill, MaxLength = 4 };
        ecrTable.Controls.Add(_ecrDefaultVatTextBox, 1, 2);

        ecrTable.Controls.Add(CreateLabel("Card terminal #"), 0, 3);
        _ecrCardTerminalInput = new NumericUpDown
        {
            Dock = DockStyle.Left,
            Minimum = 1,
            Maximum = 99,
            Width = 140,
        };
        ecrTable.Controls.Add(_ecrCardTerminalInput, 1, 3);

        var ecrHintLabel = new Label
        {
            AutoSize = true,
            Dock = DockStyle.Fill,
            ForeColor = SystemColors.GrayText,
            Text = "Creates Rec_{order}.txt (Ftext direct receipt: S lines + PAY in one file) for paid Viva/app orders only. Cash orders are skipped.",
        };
        ecrTable.Controls.Add(ecrHintLabel, 0, 4);
        ecrTable.SetColumnSpan(ecrHintLabel, 2);

        ecrGroup.Controls.Add(ecrTable);
        root.Controls.Add(ecrGroup, 0, 3);

        var statusGroup = new GroupBox
        {
            Text = "Worker Status",
            Dock = DockStyle.Fill,
            AutoSize = true,
        };
        var statusTable = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            AutoSize = true,
            ColumnCount = 2,
            Padding = new Padding(8),
        };
        statusTable.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180));
        statusTable.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

        statusTable.Controls.Add(CreateLabel("Current Status"), 0, 0);
        _workerStatusLabel = CreateValueLabel();
        statusTable.Controls.Add(_workerStatusLabel, 1, 0);

        statusTable.Controls.Add(CreateLabel("Printer Endpoint"), 0, 1);
        _printerLabel = CreateValueLabel();
        statusTable.Controls.Add(_printerLabel, 1, 1);

        statusTable.Controls.Add(CreateLabel("Lock"), 0, 2);
        _lockLabel = CreateValueLabel();
        statusTable.Controls.Add(_lockLabel, 1, 2);

        statusTable.Controls.Add(CreateLabel("Last Heartbeat"), 0, 3);
        _heartbeatLabel = CreateValueLabel();
        statusTable.Controls.Add(_heartbeatLabel, 1, 3);

        statusTable.Controls.Add(CreateLabel("Last Error"), 0, 4);
        _errorLabel = CreateValueLabel();
        _errorLabel.ForeColor = Color.Firebrick;
        statusTable.Controls.Add(_errorLabel, 1, 4);

        statusGroup.Controls.Add(statusTable);
        root.Controls.Add(statusGroup, 0, 4);

        var logsGroup = new GroupBox
        {
            Text = "Activity Log",
            Dock = DockStyle.Fill,
        };
        _logTextBox = new TextBox
        {
            Dock = DockStyle.Fill,
            Multiline = true,
            ScrollBars = ScrollBars.Vertical,
            ReadOnly = true,
            Font = new Font(FontFamily.GenericMonospace, 9.0f),
        };
        logsGroup.Controls.Add(_logTextBox);
        root.Controls.Add(logsGroup, 0, 5);

        Controls.Add(root);
    }

    private void InitializeTray()
    {
        _trayMenu.Items.Add("Open", null, (_, _) => ShowFromTray());
        _trayMenu.Items.Add("Start Worker", null, async (_, _) => await StartWorkerAsync().ConfigureAwait(true));
        _trayMenu.Items.Add("Stop Worker", null, async (_, _) => await StopWorkerAsync().ConfigureAwait(true));
        _trayMenu.Items.Add(new ToolStripSeparator());
        _trayMenu.Items.Add("Exit", null, async (_, _) => await ExitApplicationAsync().ConfigureAwait(true));

        _notifyIcon.Icon = _stoppedIcon;
        _notifyIcon.Text = "ShishaPoint Printer Tray";
        _notifyIcon.Visible = true;
        _notifyIcon.ContextMenuStrip = _trayMenu;
        _notifyIcon.DoubleClick += (_, _) => ShowFromTray();
    }

    private static Icon CreateStatusIcon(Color accentColor)
    {
        using var bitmap = new Bitmap(32, 32);
        using var graphics = Graphics.FromImage(bitmap);
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.Clear(Color.Transparent);

        var badgeBounds = new RectangleF(2.5f, 2.5f, 27f, 27f);
        using var badgeBrush = new SolidBrush(accentColor);
        using var badgeBorder = new Pen(Color.FromArgb(140, 15, 23, 42), 1.4f);
        graphics.FillEllipse(badgeBrush, badgeBounds);
        graphics.DrawEllipse(badgeBorder, badgeBounds);

        using var paperBrush = new SolidBrush(Color.FromArgb(245, 248, 255));
        using var printerBrush = new SolidBrush(Color.White);
        using var detailPen = new Pen(Color.FromArgb(35, 53, 84), 1.4f);

        graphics.FillRectangle(paperBrush, 10f, 6.5f, 12f, 7f);
        graphics.DrawRectangle(detailPen, 10f, 6.5f, 12f, 7f);

        graphics.FillRectangle(printerBrush, 7.5f, 11f, 17f, 10.5f);
        graphics.DrawRectangle(detailPen, 7.5f, 11f, 17f, 10.5f);

        graphics.FillRectangle(printerBrush, 10f, 18f, 12f, 6f);
        graphics.DrawRectangle(detailPen, 10f, 18f, 12f, 6f);

        graphics.DrawLine(detailPen, 12f, 20.5f, 20f, 20.5f);
        graphics.DrawLine(detailPen, 12f, 22.5f, 18f, 22.5f);
        graphics.FillEllipse(printerBrush, 20f, 13.5f, 2.6f, 2.6f);
        graphics.DrawEllipse(detailPen, 20f, 13.5f, 2.6f, 2.6f);

        var handle = bitmap.GetHicon();
        try
        {
            using var temp = Icon.FromHandle(handle);
            return (Icon)temp.Clone();
        }
        finally
        {
            DestroyIcon(handle);
        }
    }

    private static Label CreateLabel(string text) =>
        new()
        {
            AutoSize = true,
            Text = text,
            Padding = new Padding(0, 6, 0, 0),
        };

    private static Label CreateValueLabel() =>
        new()
        {
            AutoSize = true,
            MaximumSize = new Size(620, 0),
        };

    private WorkerSettings CaptureSettingsFromControls()
    {
        var settings = new WorkerSettings
        {
            BaseUrl = _baseUrlTextBox.Text,
            Username = _usernameTextBox.Text,
            Password = _passwordTextBox.Text,
            PollMs = (int)_pollMsInput.Value,
            LeaseMs = (int)_leaseMsInput.Value,
            LockFilePath = _lockFileTextBox.Text,
            AutoStart = _autoStartCheckBox.Checked,
            EcrExportEnabled = _ecrExportEnabledCheckBox.Checked,
            EcrExportDirectory = _ecrExportDirectoryTextBox.Text,
            EcrDefaultVat = _ecrDefaultVatTextBox.Text,
            EcrCardTerminal = (int)_ecrCardTerminalInput.Value,
        };
        settings.Normalize();
        return settings;
    }

    private void ApplySettingsToControls(WorkerSettings settings)
    {
        _baseUrlTextBox.Text = settings.BaseUrl;
        _usernameTextBox.Text = settings.Username;
        _passwordTextBox.Text = settings.Password;
        _pollMsInput.Value = Math.Max(_pollMsInput.Minimum, Math.Min(_pollMsInput.Maximum, settings.PollMs));
        _leaseMsInput.Value = Math.Max(_leaseMsInput.Minimum, Math.Min(_leaseMsInput.Maximum, settings.LeaseMs));
        _lockFileTextBox.Text = settings.LockFilePath;
        _autoStartCheckBox.Checked = settings.AutoStart;
        _ecrExportEnabledCheckBox.Checked = settings.EcrExportEnabled;
        _ecrExportDirectoryTextBox.Text = settings.EcrExportDirectory;
        _ecrDefaultVatTextBox.Text = settings.EcrDefaultVat;
        _ecrCardTerminalInput.Value = Math.Max(_ecrCardTerminalInput.Minimum, Math.Min(_ecrCardTerminalInput.Maximum, settings.EcrCardTerminal));
    }

    private void SaveSettings(bool showToast)
    {
        _settings = CaptureSettingsFromControls();
        WorkerSettingsStore.Save(_settings);
        _settingsPathLabel.Text = $"Saved to: {WorkerSettings.DefaultSettingsPath}";
        AppendLog("Settings saved.");

        if (showToast)
        {
            _notifyIcon.ShowBalloonTip(2500, "ShishaPoint Printer Tray", "Settings saved.", ToolTipIcon.Info);
        }
    }

    private async Task StartWorkerAsync()
    {
        SaveSettings(showToast: false);
        if (_worker.IsRunning)
        {
            AppendLog("Worker is already running.");
            return;
        }

        _worker.Start(_settings);
        RefreshSnapshot();
        await Task.CompletedTask;
    }

    private async Task StopWorkerAsync()
    {
        if (!_worker.IsRunning)
        {
            RefreshSnapshot();
            return;
        }

        await _worker.StopAsync().ConfigureAwait(true);
        RefreshSnapshot();
    }

    private async Task ExitApplicationAsync()
    {
        _allowExit = true;
        _notifyIcon.Visible = false;
        await StopWorkerAsync().ConfigureAwait(true);
        Close();
    }

    private void RefreshSnapshot()
    {
        var snapshot = _worker.Snapshot;

        _workerStatusLabel.Text = snapshot.StatusText;
        _printerLabel.Text = snapshot.PrinterEndpoint ?? "Not configured";
        _lockLabel.Text = snapshot.HasLock
            ? $"Held by {snapshot.LockHolder ?? "this worker"} until {FormatDateTime(snapshot.LockExpiresAt)}"
            : snapshot.LockHolder is not null
                ? $"Waiting for {snapshot.LockHolder}"
                : "Not held";
        _heartbeatLabel.Text = FormatDateTime(snapshot.LastHeartbeatAt);
        _errorLabel.Text = string.IsNullOrWhiteSpace(snapshot.LastError) ? "-" : snapshot.LastError;

        _startButton.Enabled = !snapshot.IsRunning;
        _stopButton.Enabled = snapshot.IsRunning;
        var currentIcon = snapshot.IsRunning ? _runningIcon : _stoppedIcon;
        _notifyIcon.Icon = currentIcon;
        Icon = currentIcon;

        _notifyIcon.Text = snapshot.IsRunning
            ? TrimNotifyText($"Printer: {snapshot.StatusText}")
            : "ShishaPoint Printer Tray";
    }

    private static string FormatDateTime(DateTimeOffset? value)
        => value.HasValue ? value.Value.ToLocalTime().ToString("g") : "-";

    private static string TrimNotifyText(string text)
        => text.Length <= 63 ? text : text[..63];

    private void AppendLog(string entry)
    {
        if (_logTextBox.TextLength > 48_000)
        {
            _logTextBox.Clear();
            _logTextBox.AppendText("[log trimmed]\r\n");
        }

        _logTextBox.AppendText(entry + Environment.NewLine);
        _logTextBox.SelectionStart = _logTextBox.TextLength;
        _logTextBox.ScrollToCaret();
    }

    private void PostToUi(Action action)
    {
        if (IsDisposed)
        {
            return;
        }

        if (InvokeRequired)
        {
            BeginInvoke(action);
            return;
        }

        action();
    }

    private void HideToTray()
    {
        Hide();
        ShowInTaskbar = false;
        _notifyIcon.ShowBalloonTip(
            2000,
            "ShishaPoint Printer Tray",
            "The printer worker is still available from the system tray.",
            ToolTipIcon.Info);
    }

    private void ShowFromTray()
    {
        Show();
        ShowInTaskbar = true;
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private void MainForm_Resize(object? sender, EventArgs e)
    {
        if (WindowState == FormWindowState.Minimized)
        {
            HideToTray();
        }
    }

    private void MainForm_FormClosing(object? sender, FormClosingEventArgs e)
    {
        if (_allowExit)
        {
            return;
        }

        e.Cancel = true;
        HideToTray();
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool DestroyIcon(IntPtr hIcon);
}
