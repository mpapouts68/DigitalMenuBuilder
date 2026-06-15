import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import type { BrandingSettingsResponse, PendingPrintJob, PrinterSettingsResponse } from "@/types/pos";

interface AuthUser {
  username: string;
  role: "admin" | "printer";
}

interface PendingPayload {
  order?: { orderNumber?: string; total?: number; notes?: string };
  items?: Array<{
    quantity?: number;
    productName?: string;
    lineTotal?: number;
    modifiers?: Array<{ modifierName?: string; priceDelta?: number }>;
    notes?: string;
  }>;
  type?: string;
  message?: string;
}

const PRINT_MONITOR_SCOPE = "print-monitor";

export default function PrinterPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user", PRINT_MONITOR_SCOPE],
    enabled: auth.isAuthenticated(),
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      setLocation("/orders");
      return;
    }
    if (user?.role === "printer") {
      setLocation("/orders");
    }
  }, [setLocation, user?.role]);

  const { data: settings } = useQuery<PrinterSettingsResponse | null>({
    queryKey: ["/api/printer/settings"],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/printer/settings");
      return response.json();
    },
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding", PRINT_MONITOR_SCOPE],
    enabled: true,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branding");
      return response.json();
    },
  });

  const { data: pendingJobs = [] } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/pending", PRINT_MONITOR_SCOPE],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/pending");
      return response.json();
    },
  });

  const { data: failedJobs = [] } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/failed", PRINT_MONITOR_SCOPE],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/failed?limit=20");
      return response.json();
    },
  });

  const retryFailedJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      await apiRequest("POST", `/api/admin/print-jobs/${jobId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending", PRINT_MONITOR_SCOPE] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/failed", PRINT_MONITOR_SCOPE] });
    },
  });

  useEffect(() => {
    const title = branding?.headerTitle?.trim();
    document.title = title ? `${title} - Print monitor` : "Print monitor";
  }, [branding?.headerTitle]);

  const oldestPendingAgeMs = useMemo(() => {
    if (pendingJobs.length === 0) return 0;
    const oldestCreatedAt = pendingJobs.reduce(
      (min, job) => Math.min(min, Number(job.createdAt ?? Date.now())),
      Number.MAX_SAFE_INTEGER,
    );
    return Date.now() - oldestCreatedAt;
  }, [pendingJobs]);

  const stalledQueue = pendingJobs.length > 0 && oldestPendingAgeMs > 2 * 60 * 1000;
  const workerHeartbeatStale = Boolean(
    settings?.lastSeenAt &&
      Date.now() - Number(settings.lastSeenAt) > Math.max(15000, (settings?.pollIntervalMs ?? 3000) * 4),
  );
  const pipelineUnhealthy = failedJobs.length > 0 || stalledQueue || workerHeartbeatStale;

  if (!auth.isAuthenticated() || userLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm text-slate-600">Redirecting to staff login…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {pipelineUnhealthy && (
          <Alert variant="destructive" className="border-red-400 bg-red-50">
            <AlertDescription className="font-medium">
              Print pipeline issue:
              {failedJobs.length > 0 ? ` ${failedJobs.length} failed job(s).` : ""}
              {stalledQueue
                ? ` Queue stalled (${Math.ceil(oldestPendingAgeMs / 1000)}s oldest pending).`
                : ""}
              {workerHeartbeatStale ? " Printer worker heartbeat is stale or offline." : ""}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Print monitor</CardTitle>
              <CardDescription>
                Queue status for the local ShishaPoint printer app (.NET tray). No browser polling needed.
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setLocation("/orders")}>
                Orders
              </Button>
              {user.role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => setLocation("/admin")}>
                  Admin
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Printer enabled</p>
                <p className="font-medium">{settings?.enabled ? "Yes" : "No"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Target</p>
                <p className="font-medium">
                  {settings?.printerIp ? `${settings.printerIp}:${settings.printerPort ?? 9100}` : "Not configured"}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Worker heartbeat</p>
                <p className="font-medium">
                  {settings?.lastSeenAt ? new Date(settings.lastSeenAt).toLocaleString() : "Never"}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Lock holder</p>
                <p className="font-medium truncate">{settings?.lockHolder || "none"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Pending jobs</p>
                <p className="font-medium">{pendingJobs.length}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Failed jobs</p>
                <p className="font-medium">{failedJobs.length}</p>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                Run <strong>ShishaPointPrinterTray</strong> on the printer PC. It polls the server and prints receipts
                automatically. Use this page only to diagnose queue problems.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className={pendingJobs.length > 0 ? "border-amber-300" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">Pending print jobs ({pendingJobs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingJobs.length === 0 && (
              <p className="text-sm text-slate-500">No jobs waiting in the print queue.</p>
            )}
            {pendingJobs.map((job) => {
              let payload: PendingPayload = {};
              try {
                payload = JSON.parse(job.payload) as PendingPayload;
              } catch {
                payload = {};
              }
              const isCashNotice = payload.type === "cash_payment_notice";
              return (
                <div key={job.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">
                      Job #{job.id}
                      {payload.order?.orderNumber ? ` · ${payload.order.orderNumber}` : ` · order ${job.orderId}`}
                    </p>
                    <Badge variant={isCashNotice ? "secondary" : "destructive"}>
                      {isCashNotice ? "Cash notice" : "Pending"}
                    </Badge>
                  </div>
                  {isCashNotice && payload.message ? (
                    <p className="text-xs text-slate-600 mt-1">{payload.message}</p>
                  ) : null}
                  {!!payload.items?.length && (
                    <div className="mt-2 space-y-1 text-sm">
                      {payload.items.map((item, idx) => (
                        <div key={`${job.id}-${idx}`} className="text-xs text-slate-600">
                          {item.quantity ?? 1}× {item.productName ?? "Item"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Failed print jobs ({failedJobs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {failedJobs.length === 0 && <p className="text-sm text-slate-500">No failed jobs.</p>}
            {failedJobs.map((job) => (
              <div key={job.id} className="border rounded-lg p-3 bg-white flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    Job #{job.id} · Order #{job.orderId}
                  </p>
                  <p className="text-xs text-slate-500">Attempts: {job.attempts}</p>
                  {job.lastError ? (
                    <p className="text-xs text-red-600 mt-1 break-words">{job.lastError}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => retryFailedJobMutation.mutate(job.id)}
                  disabled={retryFailedJobMutation.isPending}
                >
                  Retry
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
