using System.Globalization;
using System.Text;

namespace ShishaPointPrinterTray;

public sealed class EcrExportResult
{
    public bool Exported { get; init; }
    public string? SkippedReason { get; init; }
    public IReadOnlyList<string> WrittenFiles { get; init; } = Array.Empty<string>();
}

public static class EcrTxtExporter
{
    public static EcrExportResult TryExportPaidCardOrder(WorkerSettings settings, EcrJobPayload? payload)
    {
        if (!settings.EcrExportEnabled)
        {
            return new EcrExportResult { SkippedReason = "ECR export disabled" };
        }

        if (payload?.Order is null)
        {
            return new EcrExportResult { SkippedReason = "No order payload in print job" };
        }

        if (!IsPaidCardOrAppOrder(payload.Order))
        {
            return new EcrExportResult { SkippedReason = "Not a paid app/card order" };
        }

        var exportDirectory = NormalizeDirectory(settings.EcrExportDirectory);
        if (string.IsNullOrWhiteSpace(exportDirectory))
        {
            return new EcrExportResult { SkippedReason = "ECR export directory is not configured" };
        }

        var items = BuildEcrItems(payload);
        if (items.Count == 0)
        {
            return new EcrExportResult { SkippedReason = "Order has no line items for ECR" };
        }

        Directory.CreateDirectory(exportDirectory);
        var resultsDirectory = Path.Combine(exportDirectory, "results");
        Directory.CreateDirectory(resultsDirectory);

        var resultFilePath = Path.Combine(resultsDirectory, $"result_{DateTime.Now:yyyy_MM_dd_HH_mm_ss}.res");
        var receiptFileName = $"Rec_{payload.Order.Id}.txt";
        var receiptContent = GenerateFtextDirectReceipt(
            resultFilePath,
            items,
            payload.Order.Total,
            settings.EcrDefaultVat,
            settings.EcrCardTerminal);

        var receiptPath = Path.Combine(exportDirectory, receiptFileName);
        File.WriteAllText(receiptPath, receiptContent, Encoding.UTF8);

        return new EcrExportResult
        {
            Exported = true,
            WrittenFiles = new[] { receiptPath },
        };
    }

    private static bool IsPaidCardOrAppOrder(EcrOrder order)
    {
        var provider = order.PaymentProvider?.Trim().ToLowerInvariant();
        var status = order.PaymentStatus?.Trim().ToLowerInvariant();

        if (!string.Equals(status, "succeeded", StringComparison.Ordinal))
        {
            return false;
        }

        if (string.Equals(provider, "cash_counter", StringComparison.Ordinal))
        {
            return false;
        }

        return string.Equals(provider, "viva", StringComparison.Ordinal)
            || !string.IsNullOrWhiteSpace(provider);
    }

    private static string GenerateFtextDirectReceipt(
        string resultFilePath,
        IReadOnlyList<EcrLineItem> items,
        decimal orderTotal,
        string defaultVat,
        int cardTerminal)
    {
        var builder = new StringBuilder();
        builder.Append("RESULT_FILENAME|").Append(resultFilePath).AppendLine();

        foreach (var item in items)
        {
            builder.Append("S|")
                .Append(EscapeDescription(item.Description))
                .Append('|')
                .Append(FormatQuantity(item.Quantity))
                .Append('|')
                .Append(FormatNumber(item.Price))
                .Append("||")
                .Append(defaultVat)
                .AppendLine();
        }

        var paymentAmount = orderTotal > 0m
            ? orderTotal
            : items.Sum(item => item.Price * item.Quantity);
        builder.Append("PAY|")
            .Append(FormatNumber(paymentAmount))
            .Append('|')
            .Append(cardTerminal)
            .AppendLine();

        return builder.ToString();
    }

    private static List<EcrLineItem> BuildEcrItems(EcrJobPayload payload)
    {
        var lines = new List<EcrLineItem>();
        foreach (var item in payload.Items ?? Array.Empty<EcrOrderItem>())
        {
            if (item.Quantity <= 0)
            {
                continue;
            }

            var unitPrice = item.LineTotal / item.Quantity;
            lines.Add(new EcrLineItem(item.ProductName, item.Quantity, unitPrice));

            foreach (var modifier in item.Modifiers ?? Array.Empty<EcrOrderItemModifier>())
            {
                var modifierQty = Math.Max(1, modifier.Quantity);
                var modifierTotal = modifier.PriceDelta * modifierQty;
                if (Math.Abs(modifierTotal) < 0.0001m)
                {
                    continue;
                }

                var modifierName = string.IsNullOrWhiteSpace(modifier.ModifierGroupName)
                    ? modifier.ModifierName
                    : $"{modifier.ModifierGroupName}: {modifier.ModifierName}";
                lines.Add(new EcrLineItem(modifierName, modifierQty, modifier.PriceDelta));
            }
        }

        return lines;
    }

    private static string NormalizeDirectory(string? directory)
    {
        var normalized = string.IsNullOrWhiteSpace(directory) ? WorkerSettings.DefaultEcrExportDirectory : directory.Trim();
        return normalized.EndsWith('\\') || normalized.EndsWith('/')
            ? normalized
            : normalized + Path.DirectorySeparatorChar;
    }

    private static string EscapeDescription(string value)
        => value.Replace("|", string.Empty, StringComparison.Ordinal)
            .Replace('\r', ' ')
            .Replace('\n', ' ')
            .Trim();

    private static string FormatNumber(decimal value) => value.ToString("0.00", CultureInfo.InvariantCulture);

    private static string FormatQuantity(decimal value)
        => value % 1m == 0m
            ? ((int)value).ToString(CultureInfo.InvariantCulture)
            : value.ToString("0.##", CultureInfo.InvariantCulture);

    private sealed record EcrLineItem(string Description, decimal Quantity, decimal Price);
}

public sealed class EcrJobPayload
{
    public EcrOrder? Order { get; init; }
    public IReadOnlyList<EcrOrderItem>? Items { get; init; }
}

public sealed class EcrOrder
{
    public int Id { get; init; }
    public string? OrderNumber { get; init; }
    public string? TableCode { get; init; }
    public string? TableLabel { get; init; }
    public string? PaymentStatus { get; init; }
    public string? PaymentProvider { get; init; }
    public decimal Total { get; init; }
}

public sealed class EcrOrderItem
{
    public string ProductName { get; init; } = string.Empty;
    public int Quantity { get; init; }
    public decimal LineTotal { get; init; }
    public IReadOnlyList<EcrOrderItemModifier>? Modifiers { get; init; }
}

public sealed class EcrOrderItemModifier
{
    public string? ModifierGroupName { get; init; }
    public string ModifierName { get; init; } = string.Empty;
    public decimal PriceDelta { get; init; }
    public int Quantity { get; init; } = 1;
}
