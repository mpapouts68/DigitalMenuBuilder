import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import type {
  BrandingSettingsResponse,
  PendingPrintJob,
  PrinterClaimResponse,
  PrinterSettingsResponse,
} from "@/types/pos";

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
}

interface OpenOrderDetails {
  order: {
    id: number;
    orderNumber: string;
    status: string;
    printStatus: string;
    paymentStatus?: string | null;
    paymentProvider?: string | null;
    total: number;
    notes?: string | null;
  };
  items: Array<{
    id: number;
    productName: string;
    quantity: number;
    lineTotal: number;
    notes?: string | null;
    modifiers?: Array<{ modifierName?: string; priceDelta?: number }>;
  }>;
}

export default function PrinterPage() {
  const AUTOSTART_KEY = "printer_autostart_polling";
  const LOCK_TOKEN_KEY = "printer_lock_token";
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("printer");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const [hasLock, setHasLock] = useState(false);
  const [lockError, setLockError] = useState("");
  const [autoStartPolling, setAutoStartPolling] = useState(
    () => localStorage.getItem(AUTOSTART_KEY) === "1",
  );
  const [lastStatus, setLastStatus] = useState<string>("Idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [localBridgeUrl, setLocalBridgeUrl] = useState(
    () => localStorage.getItem("printer_local_bridge_url") || "http://127.0.0.1:17354/print-raw",
  );
  const pollTimerRef = useRef<number | null>(null);
  const pollActiveRef = useRef(false);
  const lockTokenRef = useRef<string>("");

  if (!lockTokenRef.current) {
    const existing = localStorage.getItem(LOCK_TOKEN_KEY);
    if (existing) {
      lockTokenRef.current = existing;
    } else {
      const generated = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      lockTokenRef.current = generated;
      localStorage.setItem(LOCK_TOKEN_KEY, generated);
    }
  }

  const appendLog = (entry: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${entry}`, ...prev].slice(0, 50));
  };

  const printViaLocalBridge = async (payload: { printerIp: string; printerPort: number; receipt: string }) => {
    const response = await fetch(localBridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: payload.printerIp,
        port: payload.printerPort,
        content: payload.receipt,
      }),
    });
    const body = await response.json().catch(() => ({} as { message?: string }));
    if (!response.ok) {
      throw new Error(body?.message || `Local bridge failed (${response.status})`);
    }
  };

  const { data: user, refetch: refetchUser } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user", "printer-page"],
    enabled: auth.isAuthenticated(),
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });

  const { data: settings, refetch: refetchSettings } = useQuery<PrinterSettingsResponse | null>({
    queryKey: ["/api/printer/settings"],
    enabled: !!user,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/printer/settings");
      return response.json();
    },
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding", "printer-page"],
    enabled: true,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branding");
      return response.json();
    },
  });

  const { data: pendingJobs = [] } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/pending", "printer-page"],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/pending");
      return response.json();
    },
  });

  const { data: failedJobs = [] } = useQuery<PendingPrintJob[]>({
    queryKey: ["/api/admin/print-jobs/failed", "printer-page"],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/print-jobs/failed?limit=20");
      return response.json();
    },
  });

  const { data: openOrders = [] } = useQuery<OpenOrderDetails[]>({
    queryKey: ["/api/admin/open-orders/details", "printer-page"],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/open-orders/details");
      return response.json();
    },
  });

  const { data: servedOrders = [] } = useQuery<OpenOrderDetails[]>({
    queryKey: ["/api/admin/served-orders/details", "printer-page"],
    enabled: !!user,
    refetchInterval: 3000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/served-orders/details?limit=200");
      return response.json();
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: "preparing" | "ready" | "served" }) => {
      if (status === "served") {
        await apiRequest("POST", `/api/admin/orders/${orderId}/serve`);
        return;
      }
      await apiRequest("POST", `/api/admin/orders/${orderId}/status`, { status });
    },
    onSuccess: (_data, payload) => {
      appendLog(`Order ${payload.orderId} marked as ${payload.status}.`);
      if (payload.status === "served") {
        const openCache = queryClient.getQueryData<OpenOrderDetails[]>(["/api/admin/open-orders/details", "printer-page"]) ?? [];
        const movedOrder = openCache.find((entry) => entry.order.id === payload.orderId);

        queryClient.setQueryData<OpenOrderDetails[]>(
          ["/api/admin/open-orders/details", "printer-page"],
          (prev = []) => prev.filter((entry) => entry.order.id !== payload.orderId),
        );

        if (movedOrder) {
          queryClient.setQueryData<OpenOrderDetails[]>(
            ["/api/admin/served-orders/details", "printer-page"],
            (prev = []) => {
              const exists = prev.some((entry) => entry.order.id === movedOrder.order.id);
              if (exists) return prev;
              return [{ ...movedOrder, order: { ...movedOrder.order, status: "served" } }, ...prev];
            },
          );
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/open-orders/details", "printer-page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/served-orders/details", "printer-page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      appendLog(`Failed to update order status: ${message}`);
    },
  });

  const markOrderPaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/paid`);
    },
    onSuccess: (_data, orderId) => {
      appendLog(`Order ${orderId} marked as paid and released to print queue.`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/open-orders/details", "printer-page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/served-orders/details", "printer-page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending", "printer-page"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      appendLog(`Failed to mark order as paid: ${message}`);
    },
  });

  const releaseLock = async () => {
    if (!hasLock) return;
    try {
      await apiRequest("POST", "/api/printer/lock/release", {
        lockToken: lockTokenRef.current,
      });
      appendLog("Printer lock released.");
    } catch {
      // Best effort only.
    } finally {
      setHasLock(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/printer/settings"] });
    }
  };

  const stopPolling = async () => {
    pollActiveRef.current = false;
    setIsPolling(false);
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    await releaseLock();
  };

  const acquireLock = async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const holder = `${user.username}@${window.location.host}`;
      await apiRequest("POST", "/api/printer/lock/acquire", {
        lockToken: lockTokenRef.current,
        holder,
        leaseMs: 15000,
      });
      setHasLock(true);
      setLockError("");
      appendLog(`Printer lock acquired as ${holder}.`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/printer/settings"] });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to acquire lock";
      setLockError(message);
      appendLog(`Lock acquire failed: ${message}`);
      return false;
    }
  };

  const sendHeartbeat = async (status: string, errorMessage?: string) => {
    if (!hasLock) return;
    try {
      await apiRequest("POST", "/api/printer/heartbeat", {
        status,
        errorMessage,
        lockToken: lockTokenRef.current,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/printer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/printer/settings"] });
    } catch {
      // Heartbeat failures should not interrupt polling loop
    }
  };

  const scheduleNextPoll = (delay: number) => {
    if (!pollActiveRef.current) return;
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
    }
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await apiRequest("POST", "/api/printer/claim-next", {
          lockToken: lockTokenRef.current,
        });
        const data = (await response.json()) as PrinterClaimResponse;
        if (data.status === "job" && data.job) {
          try {
            await printViaLocalBridge({
              printerIp: data.job.printerIp,
              printerPort: data.job.printerPort,
              receipt: data.job.receipt,
            });
            await apiRequest("POST", `/api/printer/jobs/${data.job.id}/complete`, {
              lockToken: lockTokenRef.current,
            });
            setLastStatus(`Printed job #${data.job.id}`);
            appendLog(`Printed order ${data.job.orderId} (job ${data.job.id}) via local bridge.`);
            await sendHeartbeat("printed");
            queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending"] });
          } catch (printError) {
            const message = printError instanceof Error ? printError.message : "Local print bridge error";
            await apiRequest("POST", `/api/printer/jobs/${data.job.id}/fail`, {
              lockToken: lockTokenRef.current,
              errorMessage: message,
            });
            setLastStatus(`Error: ${message}`);
            appendLog(`Local print failed for job ${data.job.id}: ${message}`);
            await sendHeartbeat("error", message);
          }
        } else if (data.status === "idle") {
          setLastStatus("Waiting for jobs...");
          await sendHeartbeat("idle");
        } else {
          const message = data.message ?? "Unknown claim response";
          setLastStatus(`Error: ${message}`);
          appendLog(`Claim error: ${message}`);
          await sendHeartbeat("error", message);
        }
      } catch (pollError) {
        const message = pollError instanceof Error ? pollError.message : "Network error";
        setLastStatus(`Error: ${message}`);
        appendLog(`Dispatch failed: ${message}`);
        await sendHeartbeat("error", message);
        if (message.includes("lock")) {
          pollActiveRef.current = false;
          setIsPolling(false);
          setHasLock(false);
          setLockError("Printer lock lost. Please start polling again.");
          appendLog("Polling stopped because lock is no longer valid.");
          return;
        }
      } finally {
        const nextMs = Math.max(1000, settings?.pollIntervalMs ?? 3000);
        scheduleNextPoll(nextMs);
      }
    }, delay);
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (navigator.sendBeacon && hasLock) {
        const blob = new Blob(
          [JSON.stringify({ lockToken: lockTokenRef.current })],
          { type: "application/json" },
        );
        navigator.sendBeacon("/api/printer/lock/release", blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopPolling();
    };
  }, []);

  useEffect(() => {
    if (!isPolling) return;
    if (!hasLock) return;
    pollActiveRef.current = true;
    const nextMs = Math.max(1000, settings?.pollIntervalMs ?? 3000);
    scheduleNextPoll(0);
    appendLog(`Polling started (${nextMs}ms interval).`);
  }, [hasLock, isPolling, settings?.pollIntervalMs]);

  useEffect(() => {
    localStorage.setItem(AUTOSTART_KEY, autoStartPolling ? "1" : "0");
  }, [autoStartPolling]);

  useEffect(() => {
    localStorage.setItem("printer_local_bridge_url", localBridgeUrl);
  }, [localBridgeUrl]);

  useEffect(() => {
    if (!user || !settings) return;
    if (!autoStartPolling) return;
    if (!settings.enabled || !settings.printerIp) return;
    if (!isPolling) {
      setIsPolling(true);
    }
  }, [autoStartPolling, isPolling, settings, user]);

  useEffect(() => {
    if (!isPolling || hasLock) return;
    acquireLock().then((acquired) => {
      if (!acquired) {
        setIsPolling(false);
      }
    });
  }, [isPolling, hasLock, user?.username]);

  useEffect(() => {
    const title = branding?.headerTitle?.trim();
    document.title = title ? `${title} - Printer` : "Printer";
  }, [branding?.headerTitle]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        setError(data.message || "Login failed");
        return;
      }
      auth.setToken(data.token);
      await refetchUser();
      await refetchSettings();
      appendLog(`Logged in as ${username}.`);
      setPassword("");
    } catch {
      setError("Login failed due to network error.");
    }
  };

  const handleLogout = () => {
    stopPolling();
    auth.removeToken();
    setLastStatus("Idle");
    setLockError("");
    setLogs([]);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

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

  const renderOrderCard = (entry: OpenOrderDetails, showWorkflowActions: boolean) => (
    <div key={entry.order.id} className="border rounded-lg p-3 bg-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="font-semibold">
          Order #{entry.order.orderNumber} (ID {entry.order.id})
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={entry.order.printStatus === "printed" ? "default" : "secondary"}>
            print: {entry.order.printStatus}
          </Badge>
          <Badge
            variant={
              entry.order.paymentStatus === "succeeded"
                ? "default"
                : entry.order.paymentStatus === "pending"
                  ? "secondary"
                  : "outline"
            }
          >
            pay: {entry.order.paymentStatus || "not_required"}
          </Badge>
          {entry.order.paymentProvider === "cash_counter" && entry.order.paymentStatus === "pending" && (
            <Badge variant="destructive">PAYMENT ALERT</Badge>
          )}
          <Badge variant={entry.order.status === "ready" || entry.order.status === "served" ? "default" : "secondary"}>
            {entry.order.status}
          </Badge>
          {showWorkflowActions && entry.order.paymentStatus === "pending" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm(`Confirm cash payment received for ${entry.order.orderNumber}?`)) {
                  markOrderPaidMutation.mutate(entry.order.id);
                }
              }}
              disabled={markOrderPaidMutation.isPending}
            >
              Paid
            </Button>
          ) : showWorkflowActions ? (
            <>
              <Button
                size="sm"
                variant={entry.order.status === "preparing" ? "default" : "outline"}
                onClick={() => updateOrderStatusMutation.mutate({ orderId: entry.order.id, status: "preparing" })}
                disabled={updateOrderStatusMutation.isPending}
              >
                Preparing
              </Button>
              <Button
                size="sm"
                variant={entry.order.status === "ready" ? "default" : "outline"}
                onClick={() => updateOrderStatusMutation.mutate({ orderId: entry.order.id, status: "ready" })}
                disabled={updateOrderStatusMutation.isPending}
              >
                Ready
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (window.confirm(`Mark order ${entry.order.orderNumber} as served?`)) {
                    updateOrderStatusMutation.mutate({ orderId: entry.order.id, status: "served" });
                  }
                }}
                disabled={updateOrderStatusMutation.isPending}
              >
                Served
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-2 space-y-1 text-sm">
        {entry.items.map((item) => (
          <div key={item.id} className="rounded border p-2 bg-slate-50">
            <div className="flex justify-between">
              <span>
                {item.quantity}x {item.productName}
              </span>
              <span>EUR {Number(item.lineTotal ?? 0).toFixed(2)}</span>
            </div>
            {item.modifiers?.length ? (
              <p className="text-xs text-slate-600 mt-1">
                {item.modifiers
                  .map((m) =>
                    Number(m.priceDelta ?? 0) > 0
                      ? `${m.modifierName} (+${Number(m.priceDelta).toFixed(2)})`
                      : `${m.modifierName}`,
                  )
                  .join(", ")}
              </p>
            ) : null}
            {item.notes ? <p className="text-xs text-slate-500 mt-1">Note: {item.notes}</p> : null}
          </div>
        ))}
      </div>
      {entry.order.notes ? (
        <p className="text-xs text-slate-500 mt-2">Order note: {entry.order.notes}</p>
      ) : null}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Printer Client Login</CardTitle>
            <CardDescription>Use printer account credentials for dedicated printer terminal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="printer-username">Username</Label>
                <Input
                  id="printer-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="printer-password">Password</Label>
                <Input
                  id="printer-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {pipelineUnhealthy && (
          <Alert variant="destructive" className="border-red-400 bg-red-50">
            <AlertDescription className="font-medium">
              Print pipeline unhealthy:
              {failedJobs.length > 0 ? ` ${failedJobs.length} failed job(s).` : ""}
              {stalledQueue
                ? ` Pending queue stalled (${Math.ceil(oldestPendingAgeMs / 1000)}s oldest pending job).`
                : ""}
              {workerHeartbeatStale ? " Worker heartbeat is stale/offline." : ""}
            </AlertDescription>
          </Alert>
        )}
        {pendingJobs.length > 0 && (
          <Alert className="border-red-300 bg-red-50 animate-pulse">
            <AlertDescription className="font-medium text-red-700">
              {pendingJobs.length} pending order(s) waiting to print
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Printer Client</CardTitle>
              <CardDescription>In-app polling and dispatch to network POS printer.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isPolling ? "default" : "secondary"}>{isPolling ? "Polling" : "Stopped"}</Badge>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Printer IP</p>
                <p className="font-medium">{settings?.printerIp || "Not set"}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Port</p>
                <p className="font-medium">{settings?.printerPort ?? 9100}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Interval</p>
                <p className="font-medium">{settings?.pollIntervalMs ?? 3000} ms</p>
              </div>
              <div className="border rounded-lg p-3 sm:col-span-3">
                <p className="text-xs text-slate-500 mb-1">Local print bridge URL</p>
                <Input
                  value={localBridgeUrl}
                  onChange={(event) => setLocalBridgeUrl(event.target.value)}
                  placeholder="http://127.0.0.1:17354/print-raw"
                />
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Last worker heartbeat</p>
                <p className="font-medium">
                  {settings?.lastSeenAt ? new Date(settings.lastSeenAt).toLocaleTimeString() : "Never"}
                </p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Failed jobs</p>
                <p className="font-medium">{failedJobs.length}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-slate-500">Oldest pending age</p>
                <p className="font-medium">
                  {pendingJobs.length > 0 ? `${Math.ceil(oldestPendingAgeMs / 1000)}s` : "-"}
                </p>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                {settings?.enabled
                  ? `Printer enabled. Status: ${lastStatus}. Printing runs locally through the bridge service.`
                  : "Printer is disabled in Admin settings. Enable it before polling."}
              </AlertDescription>
            </Alert>
            {lockError && (
              <Alert variant="destructive">
                <AlertDescription>{lockError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setIsPolling(true)}
                disabled={isPolling || !settings?.enabled || !settings?.printerIp}
              >
                Start polling
              </Button>
              <Button variant="outline" onClick={() => stopPolling()} disabled={!isPolling && !hasLock}>
                Stop polling
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              Lock owner: {settings?.lockHolder ?? "none"} | Lock expires:{" "}
              {settings?.lockExpiresAt ? new Date(settings.lockExpiresAt).toLocaleTimeString() : "-"}
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Auto-start polling</p>
                <p className="text-xs text-slate-500">Automatically start when this page opens.</p>
              </div>
              <Switch
                checked={autoStartPolling}
                onCheckedChange={setAutoStartPolling}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={pendingJobs.length > 0 ? "border-red-300 shadow-md" : ""}>
          <CardHeader>
            <CardTitle className="text-lg">Pending orders</CardTitle>
            <CardDescription>Full order details available even without active printer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingJobs.length === 0 && <p className="text-sm text-slate-500">No pending orders.</p>}
            {pendingJobs.map((job) => {
              let payload: PendingPayload = {};
              try {
                payload = JSON.parse(job.payload) as PendingPayload;
              } catch {
                payload = {};
              }
              return (
                <div key={job.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">
                      Job #{job.id} / Order #{payload.order?.orderNumber ?? job.orderId}
                    </p>
                    <Badge variant="destructive">Pending</Badge>
                  </div>
                  {!!payload.items?.length && (
                    <div className="mt-2 space-y-1 text-sm">
                      {payload.items.map((item, idx) => (
                        <div key={`${job.id}-${idx}`} className="rounded border p-2 bg-slate-50">
                          <div className="flex justify-between">
                            <span>
                              {item.quantity ?? 1}x {item.productName ?? "Item"}
                            </span>
                            <span>EUR {Number(item.lineTotal ?? 0).toFixed(2)}</span>
                          </div>
                          {item.modifiers?.length ? (
                            <p className="text-xs text-slate-600 mt-1">
                              {item.modifiers
                                .map((m) =>
                                  Number(m.priceDelta ?? 0) > 0
                                    ? `${m.modifierName} (+${Number(m.priceDelta).toFixed(2)})`
                                    : `${m.modifierName}`,
                                )
                                .join(", ")}
                            </p>
                          ) : null}
                          {item.notes ? <p className="text-xs text-slate-500 mt-1">Note: {item.notes}</p> : null}
                        </div>
                      ))}
                    </div>
                  )}
                  {payload.order?.notes ? (
                    <p className="text-xs text-slate-500 mt-2">Order note: {payload.order.notes}</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open orders (workflow)</CardTitle>
            <CardDescription>Active and served orders are separated to keep the active queue short.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="mb-3 grid w-full grid-cols-2">
                <TabsTrigger value="active">Active ({openOrders.length})</TabsTrigger>
                <TabsTrigger value="served">Served ({servedOrders.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3">
                {openOrders.length === 0 && (
                  <p className="text-sm text-slate-500">No active orders waiting for serve confirmation.</p>
                )}
                {openOrders.map((entry) => renderOrderCard(entry, true))}
              </TabsContent>

              <TabsContent value="served" className="space-y-3">
                {servedOrders.length === 0 && (
                  <p className="text-sm text-slate-500">No served orders yet.</p>
                )}
                {servedOrders.map((entry) => renderOrderCard(entry, false))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activity log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-300 rounded-lg p-3 font-mono text-xs h-72 overflow-y-auto space-y-1">
              {logs.length === 0 && <p>No events yet.</p>}
              {logs.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
