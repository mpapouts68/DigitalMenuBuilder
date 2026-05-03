import { type ChangeEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  AdminOrder,
  BrandingSettingsResponse,
  BrandingUpdatePayload,
  DailyRevenueStats,
  PendingPrintJob,
  PrinterSettingsResponse,
} from "@/types/pos";

interface AdminOperationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTableCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function AdminOperationsModal({ open, onOpenChange }: AdminOperationsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [businessDate, setBusinessDate] = useState(todayIsoDate());
  const [purgeBeforeDate, setPurgeBeforeDate] = useState("");
  const [brandingDraft, setBrandingDraft] = useState<BrandingUpdatePayload>({
    logoUrl: "",
    footerLogoUrl: "",
    footerText: "",
    headerTitle: "",
    headerSubtitle: "",
    backgroundImageUrl: "",
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
  });
  const [printerSettingsDraft, setPrinterSettingsDraft] = useState({
    enabled: 0,
    printerIp: "",
    printerPort: 9100,
    pollIntervalMs: 3000,
    printerProfile: "generic_escpos" as
      | "generic_escpos"
      | "samsung_srp"
      | "samsung_srp_font_b"
      | "samsung_srp_legacy"
      | "gprinter_escpos",
    printerBeepMode: "auto" as "auto" | "off" | "bel" | "esc_b" | "esc_p" | "both" | "both_plus_p",
    printerBeepCount: 4,
    printerBeepTiming: 3,
    printerRetryMaxAttempts: 5,
    printerRetryCooldownMs: 15000,
  });
  const [currentAdminPasscode, setCurrentAdminPasscode] = useState("");
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [qrBaseUrl, setQrBaseUrl] = useState(
    typeof window !== "undefined" ? `${window.location.origin}/menu` : "/menu",
  );
  const [tablePrefix, setTablePrefix] = useState("T");
  const [tableStart, setTableStart] = useState(1);
  const [tableEnd, setTableEnd] = useState(20);
  const [pickupPoint, setPickupPoint] = useState("bar");
  const [tableLabelsText, setTableLabelsText] = useState("");
  const [showUnpaidCashOnly, setShowUnpaidCashOnly] = useState(false);
  const tableCodes = Array.from({ length: Math.max(0, tableEnd - tableStart + 1) }).map((_, idx) =>
    `${tablePrefix}${tableStart + idx}`.trim(),
  );
  const tableLabelMap = tableLabelsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const [rawCode, ...rest] = line.split("=");
      if (!rawCode || rest.length === 0) return acc;
      const code = normalizeTableCode(rawCode);
      const label = rest.join("=").trim();
      if (!code || !label) return acc;
      acc[code] = label;
      return acc;
    }, {});
  const pickupUrl = `${qrBaseUrl}?mode=pickup&point=${encodeURIComponent(pickupPoint || "bar")}`;

  const openPrintableQrSheet = async () => {
    if (typeof window === "undefined") return;

    const qrImageDataUrl = async (url: string): Promise<string> => {
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrApiUrl);
      if (!response.ok) {
        throw new Error(`QR generation failed (${response.status})`);
      }
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read generated QR image"));
        reader.readAsDataURL(blob);
      });
    };

    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Menu QR Sheet", margin, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 17);

      const pickupQr = await qrImageDataUrl(pickupUrl);
      const pickupTop = 22;
      const pickupHeight = 62;
      const pickupQrSize = 42;

      doc.setDrawColor(180);
      doc.roundedRect(margin, pickupTop, pageWidth - margin * 2, pickupHeight, 2, 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Pickup (${pickupPoint || "bar"})`, margin + 3, pickupTop + 7);
      doc.addImage(pickupQr, "PNG", margin + 3, pickupTop + 10, pickupQrSize, pickupQrSize);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const pickupUrlText = doc.splitTextToSize(pickupUrl, pageWidth - margin * 2 - pickupQrSize - 12);
      doc.text(pickupUrlText, margin + pickupQrSize + 7, pickupTop + 14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Table QRs (${tableCodes.length})`, margin, pickupTop + pickupHeight + 8);

      const cols = 3;
      const cellGap = 4;
      const cellWidth = (pageWidth - margin * 2 - cellGap * (cols - 1)) / cols;
      const cellHeight = 58;
      const qrSize = 24;
      let cursorY = pickupTop + pickupHeight + 12;

      for (let idx = 0; idx < tableCodes.length; idx += 1) {
        const col = idx % cols;
        if (col === 0 && idx > 0) {
          cursorY += cellHeight + cellGap;
        }
        if (cursorY + cellHeight > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }

        const tableCode = tableCodes[idx];
        const tableLabel = tableLabelMap[normalizeTableCode(tableCode)];
        const tableUrl = `${qrBaseUrl}?mode=table&table=${encodeURIComponent(tableCode)}${
          tableLabel ? `&tableLabel=${encodeURIComponent(tableLabel)}` : ""
        }`;
        const tableQr = await qrImageDataUrl(tableUrl);

        const x = margin + col * (cellWidth + cellGap);
        doc.setDrawColor(205);
        doc.roundedRect(x, cursorY, cellWidth, cellHeight, 2, 2);
        doc.addImage(tableQr, "PNG", x + (cellWidth - qrSize) / 2, cursorY + 3, qrSize, qrSize);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(tableCode, x + cellWidth / 2, cursorY + 31, { align: "center" });

        if (tableLabel) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          const labelLines = doc.splitTextToSize(tableLabel, cellWidth - 6);
          doc.text(labelLines, x + cellWidth / 2, cursorY + 36, { align: "center", maxWidth: cellWidth - 6 });
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        const urlLines = doc.splitTextToSize(tableUrl, cellWidth - 6);
        doc.text(urlLines, x + 3, cursorY + 45, { maxWidth: cellWidth - 6 });
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      doc.save(`qr-sheet-${fileDate}.pdf`);
      toast({
        title: "PDF generated",
        description: "QR sheet downloaded as PDF.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate PDF";
      toast({
        title: "PDF generation failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const { data: pendingJobs = [], error: pendingJobsError } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/pending"],
    enabled: open,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/pending");
      return response.json();
    },
  });

  const { data: latestOrders = [], error: ordersError } = useQuery<AdminOrder[]>({
    queryKey: ["/api/admin/orders", "recent"],
    enabled: open,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/orders");
      const orders = (await response.json()) as AdminOrder[];
      return orders.slice(0, 10);
    },
  });
  const unpaidCashOrders = latestOrders.filter(
    (order) => order.paymentProvider === "cash_counter" && order.paymentStatus === "pending",
  );
  const displayedRecentOrders = showUnpaidCashOnly ? unpaidCashOrders : latestOrders;

  const { data: revenue, error: revenueError } = useQuery<DailyRevenueStats>({
    queryKey: ["/api/admin/revenue/daily", businessDate],
    enabled: open,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/admin/revenue/daily?date=${businessDate}`);
      return response.json();
    },
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding", "settings"],
    enabled: open,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branding");
      return response.json();
    },
  });
  const { data: printerSettings } = useQuery<PrinterSettingsResponse | null>({
    queryKey: ["/api/admin/printer-settings"],
    enabled: open,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/printer-settings");
      return response.json();
    },
  });

  useEffect(() => {
    if (!branding) return;
    setBrandingDraft({
      logoUrl: branding.logoUrl ?? "",
      footerLogoUrl: branding.footerLogoUrl ?? "",
      footerText: branding.footerText ?? "",
      headerTitle: branding.headerTitle ?? "",
      headerSubtitle: branding.headerSubtitle ?? "",
      backgroundImageUrl: branding.backgroundImageUrl ?? "",
      primaryColor: branding.primaryColor ?? "",
      secondaryColor: branding.secondaryColor ?? "",
      accentColor: branding.accentColor ?? "",
    });
  }, [branding]);

  const readImageFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

  const loadImageElement = (dataUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to decode image"));
      image.src = dataUrl;
    });

  const makeTransparentFromEdgeColor = async (dataUrl: string): Promise<string> => {
    const image = await loadImageElement(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx || canvas.width === 0 || canvas.height === 0) {
      return dataUrl;
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;

    const sx = Math.max(1, Math.floor(canvas.width * 0.08));
    const sy = Math.max(1, Math.floor(canvas.height * 0.08));
    const samplePoints: Array<[number, number]> = [
      [0, 0],
      [canvas.width - sx, 0],
      [0, canvas.height - sy],
      [canvas.width - sx, canvas.height - sy],
    ];

    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (const [startX, startY] of samplePoints) {
      for (let y = startY; y < startY + sy; y += 1) {
        for (let x = startX; x < startX + sx; x += 1) {
          const i = (y * canvas.width + x) * 4;
          if (pixels[i + 3] < 16) continue;
          sumR += pixels[i];
          sumG += pixels[i + 1];
          sumB += pixels[i + 2];
          count += 1;
        }
      }
    }
    if (count === 0) return dataUrl;

    const bgR = sumR / count;
    const bgG = sumG / count;
    const bgB = sumB / count;
    const hardThreshold = 34;
    const softThreshold = 72;

    let removedPixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3];
      if (a === 0) continue;
      const dr = pixels[i] - bgR;
      const dg = pixels[i + 1] - bgG;
      const db = pixels[i + 2] - bgB;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);

      if (distance <= hardThreshold) {
        pixels[i + 3] = 0;
        removedPixels += 1;
      } else if (distance < softThreshold) {
        const keep = (distance - hardThreshold) / (softThreshold - hardThreshold);
        pixels[i + 3] = Math.round(a * keep);
        if (pixels[i + 3] < 8) {
          pixels[i + 3] = 0;
          removedPixels += 1;
        }
      }
    }

    const totalPixels = canvas.width * canvas.height;
    if (removedPixels < totalPixels * 0.01) {
      // Background was not dominant; keep original image untouched.
      return dataUrl;
    }

    ctx.putImageData(frame, 0, 0);
    return canvas.toDataURL("image/png");
  };

  const handleBrandingImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    key: "logoUrl" | "footerLogoUrl" | "backgroundImageUrl",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const uploadedDataUrl = await readImageFileAsDataUrl(file);
      const dataUrl =
        key === "logoUrl" || key === "footerLogoUrl"
          ? await makeTransparentFromEdgeColor(uploadedDataUrl)
          : uploadedDataUrl;
      setBrandingDraft((prev) => ({ ...prev, [key]: dataUrl }));
    } catch {
      toast({
        title: "Image upload failed",
        description: "Could not process selected image.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!printerSettings) return;
    setPrinterSettingsDraft({
      enabled: printerSettings.enabled,
      printerIp: printerSettings.printerIp ?? "",
      printerPort: printerSettings.printerPort ?? 9100,
      pollIntervalMs: printerSettings.pollIntervalMs ?? 3000,
      printerProfile: printerSettings.printerProfile ?? "generic_escpos",
      printerBeepMode: printerSettings.printerBeepMode ?? "auto",
      printerBeepCount: printerSettings.printerBeepCount ?? 4,
      printerBeepTiming: printerSettings.printerBeepTiming ?? 3,
      printerRetryMaxAttempts: printerSettings.printerRetryMaxAttempts ?? 5,
      printerRetryCooldownMs: printerSettings.printerRetryCooldownMs ?? 15000,
    });
  }, [printerSettings]);

  const completeJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/admin/print-jobs/${jobId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
  });

  const closeDayMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/day-close", {
        businessDate,
        purgeBeforeDate: purgeBeforeDate || undefined,
      });
    },
    onSuccess: () => {
      toast({
        title: "Day closed",
        description: "Daily snapshot saved and order statuses closed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: () => {
      toast({
        title: "Day close failed",
        description: "Could not close day. Check date fields and retry.",
        variant: "destructive",
      });
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/branding", brandingDraft);
    },
    onSuccess: () => {
      toast({
        title: "Branding updated",
        description: "Header, background, footer, and colors were saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
    },
    onError: () => {
      toast({
        title: "Branding update failed",
        description: "Could not save branding settings.",
        variant: "destructive",
      });
    },
  });

  const savePrinterSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", "/api/admin/printer-settings", {
        enabled: printerSettingsDraft.enabled,
        printerIp: printerSettingsDraft.printerIp || null,
        printerPort: printerSettingsDraft.printerPort,
        pollIntervalMs: printerSettingsDraft.pollIntervalMs,
        printerProfile: printerSettingsDraft.printerProfile,
        printerBeepMode: printerSettingsDraft.printerBeepMode,
        printerBeepCount: printerSettingsDraft.printerBeepCount,
        printerBeepTiming: printerSettingsDraft.printerBeepTiming,
        printerRetryMaxAttempts: printerSettingsDraft.printerRetryMaxAttempts,
        printerRetryCooldownMs: printerSettingsDraft.printerRetryCooldownMs,
      });
      return (await response.json()) as PrinterSettingsResponse;
    },
    onSuccess: (savedSettings) => {
      toast({
        title: "Printer settings updated",
        description: "Printer client can now poll and print using new network settings.",
      });
      queryClient.setQueryData(["/api/admin/printer-settings"], savedSettings);
      setPrinterSettingsDraft({
        enabled: savedSettings.enabled,
        printerIp: savedSettings.printerIp ?? "",
        printerPort: savedSettings.printerPort ?? 9100,
        pollIntervalMs: savedSettings.pollIntervalMs ?? 3000,
        printerProfile: savedSettings.printerProfile ?? "generic_escpos",
        printerBeepMode: savedSettings.printerBeepMode ?? "auto",
        printerBeepCount: savedSettings.printerBeepCount ?? 4,
        printerBeepTiming: savedSettings.printerBeepTiming ?? 3,
        printerRetryMaxAttempts: savedSettings.printerRetryMaxAttempts ?? 5,
        printerRetryCooldownMs: savedSettings.printerRetryCooldownMs ?? 15000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/printer/settings"] });
    },
    onError: () => {
      toast({
        title: "Printer settings failed",
        description: "Could not save printer settings.",
        variant: "destructive",
      });
    },
  });

  const updateAdminPasscodeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/security/passcode", {
        currentPasscode: currentAdminPasscode,
        newPasscode: newAdminPasscode,
      });
    },
    onSuccess: () => {
      toast({
        title: "Admin passcode updated",
        description: "Use the new passcode for admin login.",
      });
      setCurrentAdminPasscode("");
      setNewAdminPasscode("");
    },
    onError: () => {
      toast({
        title: "Passcode update failed",
        description: "Current passcode may be incorrect.",
        variant: "destructive",
      });
    },
  });

  const testPrinterMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/printer/test");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Printer test sent",
        description: "A test ticket was sent to the configured printer.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
    },
    onError: () => {
      toast({
        title: "Printer test failed",
        description: "Could not connect to printer with current settings.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
    },
  });

  const testBeepMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/printer/test-beep");
      return response.json();
    },
    onSuccess: (data: { beepMode?: string }) => {
      toast({
        title: "Beep test sent",
        description: data?.beepMode
          ? `Beep-only command sent (mode: ${data.beepMode}).`
          : "Beep-only command sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
    },
    onError: () => {
      toast({
        title: "Beep test failed",
        description: "Could not send a beep-only command with current printer settings.",
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Admin operations</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="print" className="space-y-4">
          <TabsList className="w-full overflow-x-auto whitespace-nowrap inline-flex h-auto gap-1 p-1">
            <TabsTrigger value="print">Print queue</TabsTrigger>
            <TabsTrigger value="revenue">Revenue / close day</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="qr">QR generator</TabsTrigger>
          </TabsList>

          <TabsContent value="print" className="space-y-3">
            {(pendingJobsError || ordersError) && (
              <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs px-3 py-2">
                Failed to load print queue data. Admin API requires a valid login token (`/login`).
              </div>
            )}
            <div className="rounded-lg border p-3 space-y-3">
              <h3 className="font-semibold">Network printer settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Printer IP</Label>
                  <Input
                    placeholder="192.168.1.50"
                    value={printerSettingsDraft.printerIp}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({ ...prev, printerIp: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={printerSettingsDraft.printerPort}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerPort: Number(event.target.value) || 9100,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Poll interval (ms)</Label>
                  <Input
                    type="number"
                    value={printerSettingsDraft.pollIntervalMs}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        pollIntervalMs: Math.max(1000, Number(event.target.value) || 3000),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Enabled</Label>
                  <select
                    className="h-10 rounded-md border px-3 text-sm w-full"
                    value={printerSettingsDraft.enabled ? "1" : "0"}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({ ...prev, enabled: Number(event.target.value) }))
                    }
                  >
                    <option value="1">Enabled</option>
                    <option value="0">Disabled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Printer profile</Label>
                  <select
                    className="h-10 rounded-md border px-3 text-sm w-full"
                    value={printerSettingsDraft.printerProfile}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerProfile: event.target.value as
                          | "generic_escpos"
                          | "samsung_srp"
                          | "samsung_srp_font_b"
                          | "samsung_srp_legacy"
                          | "gprinter_escpos",
                      }))
                    }
                  >
                    <option value="generic_escpos">Generic ESC/POS</option>
                    <option value="samsung_srp">Samsung SRP (clean)</option>
                    <option value="samsung_srp_font_b">Samsung SRP (Font B)</option>
                    <option value="samsung_srp_legacy">Samsung SRP (legacy bold)</option>
                    <option value="gprinter_escpos">GPrinter ESC/POS</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Beep mode</Label>
                  <select
                    className="h-10 rounded-md border px-3 text-sm w-full"
                    value={printerSettingsDraft.printerBeepMode}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerBeepMode: event.target.value as
                          | "auto"
                          | "off"
                          | "bel"
                          | "esc_b"
                          | "esc_p"
                          | "both"
                          | "both_plus_p",
                      }))
                    }
                  >
                    <option value="auto">Auto (from profile)</option>
                    <option value="off">Off</option>
                    <option value="bel">BEL</option>
                    <option value="esc_b">ESC B</option>
                    <option value="esc_p">ESC p (SRP pulse)</option>
                    <option value="both">BEL + ESC B</option>
                    <option value="both_plus_p">BEL + ESC B + ESC p x2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>ESC B beep count (n)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={printerSettingsDraft.printerBeepCount}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerBeepCount: Math.max(1, Math.min(9, Number(event.target.value) || 4)),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>ESC B beep timing (t)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    value={printerSettingsDraft.printerBeepTiming}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerBeepTiming: Math.max(1, Math.min(9, Number(event.target.value) || 3)),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Retry max attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={printerSettingsDraft.printerRetryMaxAttempts}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerRetryMaxAttempts: Math.max(1, Math.min(20, Number(event.target.value) || 5)),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Retry cooldown (ms)</Label>
                  <Input
                    type="number"
                    min={1000}
                    max={300000}
                    step={1000}
                    value={printerSettingsDraft.printerRetryCooldownMs}
                    onChange={(event) =>
                      setPrinterSettingsDraft((prev) => ({
                        ...prev,
                        printerRetryCooldownMs: Math.max(
                          1000,
                          Math.min(300000, Number(event.target.value) || 15000),
                        ),
                      }))
                    }
                  />
                </div>
              </div>
              <Button onClick={() => savePrinterSettingsMutation.mutate()} disabled={savePrinterSettingsMutation.isPending}>
                {savePrinterSettingsMutation.isPending ? "Saving..." : "Save printer settings"}
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="border rounded-lg p-2 text-xs">
                  <p className="text-slate-500">Last seen</p>
                  <p className="font-medium">
                    {printerSettings?.lastSeenAt ? new Date(printerSettings.lastSeenAt).toLocaleString() : "Never"}
                  </p>
                </div>
                <div className="border rounded-lg p-2 text-xs">
                  <p className="text-slate-500">Last status</p>
                  <p className="font-medium">{printerSettings?.lastStatus ?? "Unknown"}</p>
                </div>
                <div className="border rounded-lg p-2 text-xs">
                  <p className="text-slate-500">Last error</p>
                  <p className="font-medium truncate">{printerSettings?.lastError ?? "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="border rounded-lg p-2 text-xs">
                  <p className="text-slate-500">Lock holder</p>
                  <p className="font-medium">{printerSettings?.lockHolder ?? "None"}</p>
                </div>
                <div className="border rounded-lg p-2 text-xs">
                  <p className="text-slate-500">Lock expires</p>
                  <p className="font-medium">
                    {printerSettings?.lockExpiresAt
                      ? new Date(printerSettings.lockExpiresAt).toLocaleString()
                      : "-"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => testPrinterMutation.mutate()}
                disabled={testPrinterMutation.isPending || !printerSettingsDraft.printerIp}
              >
                {testPrinterMutation.isPending ? "Testing..." : "Test printer connection"}
              </Button>
              <Button
                variant="outline"
                onClick={() => testBeepMutation.mutate()}
                disabled={testBeepMutation.isPending || !printerSettingsDraft.printerIp}
              >
                {testBeepMutation.isPending ? "Sending beep..." : "Test beep only"}
              </Button>
              <p className="text-xs text-slate-500">
                Run printer mode at `/printer` using printer credentials to start polling.
              </p>
              <p className="text-xs text-slate-500">
                Profile adjusts title formatting/beep defaults per printer family. You can still override beep using
                `PRINTER_BEEP_MODE`.
              </p>
            </div>

            <div className="rounded-lg border p-3 bg-slate-50 text-sm">
              Built-in printer client uses `POST /api/printer/dispatch-next` to poll queue and print directly to the configured network printer.
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Pending jobs ({pendingJobs.length})</h3>
              {pendingJobs.length === 0 && <p className="text-sm text-slate-500">No pending print jobs.</p>}
              {pendingJobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">Job #{job.id} / Order #{job.orderId}</p>
                    <p className="text-xs text-slate-500">Attempts: {job.attempts}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => completeJobMutation.mutate(job.id)}
                    disabled={completeJobMutation.isPending}
                  >
                    Mark printed
                  </Button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">Recent orders</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    PAYMENT ALERT: {unpaidCashOrders.length}
                  </span>
                  <Button
                    size="sm"
                    variant={showUnpaidCashOnly ? "default" : "outline"}
                    onClick={() => setShowUnpaidCashOnly((prev) => !prev)}
                  >
                    {showUnpaidCashOnly ? "Show all" : "Unpaid cash only"}
                  </Button>
                </div>
              </div>
              {displayedRecentOrders.length === 0 && (
                <p className="text-sm text-slate-500">
                  {showUnpaidCashOnly ? "No unpaid cash orders." : "No recent orders."}
                </p>
              )}
              {displayedRecentOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-3 text-sm flex justify-between">
                  <span>{order.orderNumber}</span>
                  <div className="flex items-center gap-2">
                    {order.paymentProvider === "cash_counter" && order.paymentStatus === "pending" && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        PAYMENT ALERT
                      </span>
                    )}
                    <span>
                      {order.status} / {order.printStatus} / pay:{order.paymentStatus ?? "not_required"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            {revenueError && (
              <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 text-xs px-3 py-2">
                Failed to load revenue data. Admin API requires a valid login token (`/login`).
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Business date</Label>
                <Input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Purge orders before (optional)</Label>
                <Input
                  type="date"
                  value={purgeBeforeDate}
                  onChange={(event) => setPurgeBeforeDate(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Total orders</p>
                <p className="text-xl font-semibold">{revenue?.totalOrders ?? 0}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Gross revenue</p>
                <p className="text-xl font-semibold">EUR {(revenue?.grossRevenue ?? 0).toFixed(2)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Open orders</p>
                <p className="text-xl font-semibold">{revenue?.openOrders ?? 0}</p>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={() => closeDayMutation.mutate()}
              disabled={closeDayMutation.isPending}
            >
              {closeDayMutation.isPending ? "Closing day..." : "Close day"}
            </Button>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Header logo</Label>
                <Input
                  value={brandingDraft.logoUrl ?? ""}
                  onChange={(event) => setBrandingDraft((prev) => ({ ...prev, logoUrl: event.target.value }))}
                />
                <Input type="file" accept="image/*" onChange={(event) => handleBrandingImageUpload(event, "logoUrl")} />
                {brandingDraft.logoUrl && (
                  <div className="border rounded p-2 inline-flex">
                    <img src={brandingDraft.logoUrl} alt="Header logo preview" className="h-10 w-auto object-contain" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Header title</Label>
                <Input
                  value={brandingDraft.headerTitle ?? ""}
                  placeholder="Restaurant name"
                  onChange={(event) => setBrandingDraft((prev) => ({ ...prev, headerTitle: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Header subtitle (quote)</Label>
                <Input
                  value={brandingDraft.headerSubtitle ?? ""}
                  placeholder="A short welcome line"
                  onChange={(event) => setBrandingDraft((prev) => ({ ...prev, headerSubtitle: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Background image URL</Label>
                <Input
                  value={brandingDraft.backgroundImageUrl ?? ""}
                  placeholder="/backgrnd.PNG or paste image data URL"
                  onChange={(event) =>
                    setBrandingDraft((prev) => ({ ...prev, backgroundImageUrl: event.target.value }))
                  }
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleBrandingImageUpload(event, "backgroundImageUrl")}
                />
                {brandingDraft.backgroundImageUrl && (
                  <div className="border rounded p-2 h-16 w-full max-w-xs overflow-hidden">
                    <img
                      src={brandingDraft.backgroundImageUrl}
                      alt="Background preview"
                      className="h-full w-full object-cover object-left"
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Leave empty to use the default tiled strip at <code className="text-[11px]">/backgrnd.PNG</code> from
                  the app public folder.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Footer logo</Label>
                <Input
                  value={brandingDraft.footerLogoUrl ?? ""}
                  onChange={(event) => setBrandingDraft((prev) => ({ ...prev, footerLogoUrl: event.target.value }))}
                />
                <Input type="file" accept="image/*" onChange={(event) => handleBrandingImageUpload(event, "footerLogoUrl")} />
                {brandingDraft.footerLogoUrl && (
                  <div className="border rounded p-2 inline-flex">
                    <img src={brandingDraft.footerLogoUrl} alt="Footer logo preview" className="h-8 w-auto object-contain" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Footer text</Label>
                <Input
                  value={brandingDraft.footerText ?? ""}
                  onChange={(event) => setBrandingDraft((prev) => ({ ...prev, footerText: event.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Primary color</Label>
                  <Input
                    type="color"
                    value={brandingDraft.primaryColor || "#2563eb"}
                    onChange={(event) => setBrandingDraft((prev) => ({ ...prev, primaryColor: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secondary color</Label>
                  <Input
                    type="color"
                    value={brandingDraft.secondaryColor || "#f1f5f9"}
                    onChange={(event) => setBrandingDraft((prev) => ({ ...prev, secondaryColor: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accent color</Label>
                  <Input
                    type="color"
                    value={brandingDraft.accentColor || "#f59e0b"}
                    onChange={(event) => setBrandingDraft((prev) => ({ ...prev, accentColor: event.target.value }))}
                  />
                </div>
              </div>

            <div className="border rounded-lg p-3 space-y-2">
              <Label className="text-sm font-semibold">Admin passcode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  type="password"
                  placeholder="Current passcode"
                  value={currentAdminPasscode}
                  onChange={(event) => setCurrentAdminPasscode(event.target.value)}
                />
                <Input
                  type="password"
                  placeholder="New passcode (min 4 chars)"
                  value={newAdminPasscode}
                  onChange={(event) => setNewAdminPasscode(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateAdminPasscodeMutation.mutate()}
                disabled={
                  updateAdminPasscodeMutation.isPending ||
                  currentAdminPasscode.trim().length === 0 ||
                  newAdminPasscode.trim().length < 4
                }
              >
                {updateAdminPasscodeMutation.isPending ? "Updating..." : "Change admin passcode"}
              </Button>
            </div>
            </div>

            <Button onClick={() => saveBrandingMutation.mutate()} disabled={saveBrandingMutation.isPending}>
              {saveBrandingMutation.isPending ? "Saving..." : "Save branding"}
            </Button>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Base menu URL</Label>
                <Input value={qrBaseUrl} onChange={(event) => setQrBaseUrl(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pickup point name</Label>
                <Input value={pickupPoint} onChange={(event) => setPickupPoint(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Table prefix</Label>
                <Input value={tablePrefix} onChange={(event) => setTablePrefix(event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="number"
                    value={tableStart}
                    onChange={(event) => setTableStart(Math.max(1, Number(event.target.value) || 1))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Input
                    type="number"
                    value={tableEnd}
                    onChange={(event) => setTableEnd(Math.max(tableStart, Number(event.target.value) || tableStart))}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Per-table labels (optional)</Label>
              <textarea
                className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
                placeholder={"T1=Terrace left\nT2=Terrace right\nT10=Pool side"}
                value={tableLabelsText}
                onChange={(event) => setTableLabelsText(event.target.value)}
              />
              <p className="text-xs text-slate-500">
                Use format <code>TABLE_CODE=Label</code> (example: <code>T1=Terrace left</code>). Labels are added to QR URL as <code>tableLabel</code>.
              </p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-semibold text-sm">Pickup QR</p>
              <div className="flex items-center gap-3 flex-wrap">
                <QRCodeSVG
                  value={`${qrBaseUrl}?mode=pickup&point=${encodeURIComponent(pickupPoint || "bar")}`}
                  size={100}
                />
                <div className="text-xs break-all">
                  {`${qrBaseUrl}?mode=pickup&point=${encodeURIComponent(pickupPoint || "bar")}`}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-sm">Table QRs</p>
              <Button type="button" variant="outline" onClick={openPrintableQrSheet}>
                Download printable QR PDF
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tableCodes.map((tableCode) => {
                  const tableLabel = tableLabelMap[normalizeTableCode(tableCode)];
                  const url = `${qrBaseUrl}?mode=table&table=${encodeURIComponent(tableCode)}${
                    tableLabel ? `&tableLabel=${encodeURIComponent(tableLabel)}` : ""
                  }`;
                  return (
                    <div key={tableCode} className="rounded-lg border p-3 flex items-center gap-3">
                      <QRCodeSVG value={url} size={72} />
                      <div className="text-xs min-w-0">
                        <p className="font-semibold">{tableCode}</p>
                        {tableLabel && <p className="text-slate-600">{tableLabel}</p>}
                        <p className="break-all">{url}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
