import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Volume2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { auth } from "@/lib/auth";
import { useNewOrderAlarm } from "@/hooks/use-new-order-alarm";
import {
  playOrderAlarm,
  readOrderAlarmEnabled,
  requestOrderNotificationPermission,
  unlockOrderAlarmAudio,
  writeOrderAlarmEnabled,
} from "@/lib/order-alarm";
import type {
  BrandingSettingsResponse,
  StaffOrderDetails,
  StaffOrderPaymentFilter,
  StaffOrderServiceFilter,
} from "@/types/pos";

interface AuthUser {
  username: string;
  role: "admin" | "printer";
}

const ORDERS_QUERY_SCOPE = "orders-page";

function formatOrderTime(createdAt?: number): string {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function paymentLabel(entry: StaffOrderDetails): string {
  if (entry.order.paymentProvider === "viva") return "Card";
  if (entry.order.paymentProvider === "cash_counter") return "Cash";
  return entry.order.paymentProvider || "—";
}

function isOrderPaid(entry: StaffOrderDetails): boolean {
  const status = entry.order.paymentStatus;
  return status === "succeeded" || status === "not_required";
}

function paymentStatusBadgeLabel(entry: StaffOrderDetails): string {
  if (isOrderPaid(entry)) return "Paid";
  if (entry.order.paymentStatus === "pending") return "Unpaid";
  return entry.order.paymentStatus || "—";
}

function matchesPaymentFilter(entry: StaffOrderDetails, filter: StaffOrderPaymentFilter): boolean {
  if (filter === "all") return true;
  if (filter === "cash") return entry.order.paymentProvider === "cash_counter";
  if (filter === "card") return entry.order.paymentProvider === "viva";
  return (
    entry.order.paymentProvider === "cash_counter" && entry.order.paymentStatus === "pending"
  );
}

function matchesServiceFilter(entry: StaffOrderDetails, filter: StaffOrderServiceFilter): boolean {
  if (filter === "all") return true;
  return entry.order.serviceMode === filter;
}

function serviceSummary(entry: StaffOrderDetails): string {
  if (entry.order.serviceMode === "table") {
    const code = entry.order.tableCode || "—";
    const label = entry.order.tableLabel?.trim();
    return label ? `Table ${code} (${label})` : `Table ${code}`;
  }
  return `Pickup · ${entry.order.pickupPoint || "bar"}`;
}

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("printer");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<StaffOrderPaymentFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<StaffOrderServiceFilter>("all");
  const [orderAlarmEnabled, setOrderAlarmEnabled] = useState(() => readOrderAlarmEnabled());

  const { data: user, refetch: refetchUser } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user", ORDERS_QUERY_SCOPE],
    enabled: auth.isAuthenticated(),
    retry: false,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/auth/user");
      return response.json();
    },
  });

  const { data: branding } = useQuery<BrandingSettingsResponse | null>({
    queryKey: ["/api/branding", ORDERS_QUERY_SCOPE],
    enabled: true,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/branding");
      return response.json();
    },
  });

  const { data: openOrders = [] } = useQuery<StaffOrderDetails[]>({
    queryKey: ["/api/admin/open-orders/details", ORDERS_QUERY_SCOPE],
    enabled: !!user,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/open-orders/details");
      return response.json();
    },
  });

  const { data: servedOrders = [] } = useQuery<StaffOrderDetails[]>({
    queryKey: ["/api/admin/served-orders/details", ORDERS_QUERY_SCOPE],
    enabled: !!user,
    refetchInterval: 5000,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/served-orders/details?limit=200");
      return response.json();
    },
  });

  const {
    unacknowledgedOrders,
    unacknowledgedCount,
    acknowledgeOrder,
    acknowledgeAll,
  } = useNewOrderAlarm(openOrders, { enabled: orderAlarmEnabled, active: !!user });

  const clearServedOrdersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/orders/clear-served");
      return response.json() as Promise<{ deletedCount: number }>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/served-orders/details", ORDERS_QUERY_SCOPE] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      if (result.deletedCount > 0) {
        window.alert(`Removed ${result.deletedCount} served order(s).`);
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/open-orders/details", ORDERS_QUERY_SCOPE] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/served-orders/details", ORDERS_QUERY_SCOPE] });
    },
  });

  const markOrderPaidMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("POST", `/api/admin/orders/${orderId}/paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/open-orders/details", ORDERS_QUERY_SCOPE] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/served-orders/details", ORDERS_QUERY_SCOPE] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending"] });
    },
  });

  useEffect(() => {
    const title = branding?.headerTitle?.trim();
    document.title = title ? `${title} - Orders` : "Orders";
  }, [branding?.headerTitle]);

  useEffect(() => {
    const resumeAlarmOnFocus = () => {
      if (document.visibilityState !== "visible" || !orderAlarmEnabled || unacknowledgedCount === 0) {
        return;
      }
      unlockOrderAlarmAudio();
      void playOrderAlarm();
    };
    document.addEventListener("visibilitychange", resumeAlarmOnFocus);
    return () => document.removeEventListener("visibilitychange", resumeAlarmOnFocus);
  }, [orderAlarmEnabled, unacknowledgedCount]);

  const filteredOpenOrders = useMemo(
    () =>
      openOrders.filter(
        (entry) => matchesPaymentFilter(entry, paymentFilter) && matchesServiceFilter(entry, serviceFilter),
      ),
    [openOrders, paymentFilter, serviceFilter],
  );

  const filteredServedOrders = useMemo(
    () =>
      servedOrders.filter(
        (entry) => matchesPaymentFilter(entry, paymentFilter) && matchesServiceFilter(entry, serviceFilter),
      ),
    [servedOrders, paymentFilter, serviceFilter],
  );

  const unpaidCashCount = useMemo(
    () =>
      openOrders.filter(
        (entry) =>
          entry.order.paymentProvider === "cash_counter" && entry.order.paymentStatus === "pending",
      ).length,
    [openOrders],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    unlockOrderAlarmAudio();
    void requestOrderNotificationPermission();
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.token) {
        setLoginError(data.message || "Login failed");
        return;
      }
      auth.setToken(data.token);
      await refetchUser();
      setPassword("");
    } catch {
      setLoginError("Login failed due to network error.");
    }
  };

  const toggleOrderAlarm = () => {
    unlockOrderAlarmAudio();
    const next = !orderAlarmEnabled;
    setOrderAlarmEnabled(next);
    writeOrderAlarmEnabled(next);
    if (next) {
      void requestOrderNotificationPermission();
    }
  };

  const testOrderAlarm = () => {
    unlockOrderAlarmAudio();
    void requestOrderNotificationPermission();
    void playOrderAlarm();
  };

  const handleLogout = () => {
    auth.removeToken();
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  const renderOrderCard = (entry: StaffOrderDetails, showWorkflowActions: boolean) => {
    const isUnpaidCash =
      entry.order.paymentProvider === "cash_counter" && entry.order.paymentStatus === "pending";
    const paid = isOrderPaid(entry);

    return (
      <div key={entry.order.id} className="border rounded-lg p-3 bg-white shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-base">
                {entry.order.orderNumber}
                {entry.order.createdAt ? (
                  <span className="text-slate-500 font-normal text-sm ml-2">
                    {formatOrderTime(entry.order.createdAt)}
                  </span>
                ) : null}
              </p>
              <p className="text-sm text-slate-600">{serviceSummary(entry)}</p>
              {(entry.order.customerName || entry.order.customerPhone) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {[entry.order.customerName, entry.order.customerPhone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <p className="font-semibold text-lg shrink-0">€{Number(entry.order.total ?? 0).toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{paymentLabel(entry)}</Badge>
            <Badge
              variant={paid ? "default" : entry.order.paymentStatus === "pending" ? "secondary" : "outline"}
              className={paid ? "bg-emerald-600 hover:bg-emerald-600" : undefined}
            >
              {paymentStatusBadgeLabel(entry)}
            </Badge>
            <Badge variant={entry.order.printStatus === "printed" ? "default" : "secondary"}>
              print: {entry.order.printStatus}
            </Badge>
            <Badge
              variant={
                entry.order.status === "ready" || entry.order.status === "served" ? "default" : "secondary"
              }
            >
              {entry.order.status}
            </Badge>
            {isUnpaidCash && <Badge variant="destructive">PAYMENT ALERT</Badge>}
            {showWorkflowActions && isUnpaidCash && (
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
            )}
          </div>

          {showWorkflowActions && paid && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm"
                variant={entry.order.status === "preparing" ? "default" : "outline"}
                onClick={() =>
                  updateOrderStatusMutation.mutate({ orderId: entry.order.id, status: "preparing" })
                }
                disabled={updateOrderStatusMutation.isPending}
              >
                Preparing
              </Button>
              <Button
                size="sm"
                variant={entry.order.status === "ready" ? "default" : "outline"}
                onClick={() =>
                  updateOrderStatusMutation.mutate({ orderId: entry.order.id, status: "ready" })
                }
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
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          {entry.items.map((item) => (
            <div key={item.id} className="rounded border p-2 bg-slate-50">
              <div className="flex justify-between gap-2">
                <span>
                  {item.quantity}× {item.productName}
                </span>
                <span className="shrink-0">€{Number(item.lineTotal ?? 0).toFixed(2)}</span>
              </div>
              {item.modifiers?.length ? (
                <p className="text-xs text-slate-600 mt-1">
                  {item.modifiers
                    .map((m) =>
                      Number(m.priceDelta ?? 0) > 0
                        ? `${m.modifierName} (+€${Number(m.priceDelta).toFixed(2)})`
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
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Staff login</CardTitle>
            <CardDescription>Sign in to manage orders (printer or admin account).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orders-username">Username</Label>
                <Input
                  id="orders-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orders-password">Password</Label>
                <Input
                  id="orders-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
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
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Orders</CardTitle>
              <CardDescription>
                All active and served orders — cash and card. Printing is handled by the local printer app.
                {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted"
                  ? " Allow browser notifications so new orders alert you when this tab is in the background."
                  : ""}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant={orderAlarmEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleOrderAlarm}
                title={orderAlarmEnabled ? "Order alarm on" : "Order alarm off"}
              >
                {orderAlarmEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                <span className="ml-1.5 hidden sm:inline">{orderAlarmEnabled ? "Alarm on" : "Alarm off"}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={testOrderAlarm} title="Test order alarm">
                <Volume2 className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">Test</span>
              </Button>
              {user.role === "admin" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/admin")}>
                    Admin
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/printer")}>
                    Print monitor
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </CardHeader>
        </Card>

        {unacknowledgedCount > 0 && (
          <Alert className="sticky top-2 z-50 border-amber-500 bg-amber-50 shadow-md">
            <AlertDescription className="space-y-3">
              <p className="font-semibold text-amber-950">
                {unacknowledgedCount === 1
                  ? "New order received"
                  : `${unacknowledgedCount} new orders received`}
                {orderAlarmEnabled ? " — alarm will repeat until you confirm." : "."}
              </p>
              <ul className="space-y-2 text-sm text-amber-900">
                {unacknowledgedOrders.map((entry) => (
                  <li
                    key={entry.order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-white/80 px-3 py-2"
                  >
                    <span>
                      <strong>{entry.order.orderNumber}</strong>
                      {" · "}
                      {serviceSummary(entry)}
                      {" · "}
                      €{Number(entry.order.total).toFixed(2)}
                      {entry.order.paymentProvider === "cash_counter" &&
                      entry.order.paymentStatus === "pending"
                        ? " · unpaid cash"
                        : ""}
                    </span>
                    {unacknowledgedCount > 1 && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeOrder(entry.order.id)}>
                        Seen
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
              <Button className="w-full sm:w-auto" onClick={acknowledgeAll}>
                {unacknowledgedCount === 1 ? "I've seen this order" : "I've seen all orders"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {orderAlarmEnabled && unacknowledgedCount === 0 && (
          <p className="text-xs text-slate-500 text-center">
            PC alarm repeats for new orders until you confirm. Keep this tab open and use Test once so the browser allows sound.
          </p>
        )}

        {unpaidCashCount > 0 && (
          <Alert className="border-red-300 bg-red-50">
            <AlertDescription className="font-medium text-red-800">
              {unpaidCashCount} cash order{unpaidCashCount === 1 ? "" : "s"} awaiting payment at the bar.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase self-center mr-1">Payment</span>
              {(
                [
                  ["all", "All"],
                  ["cash", "Cash"],
                  ["card", "Card"],
                  ["unpaid_cash", "Unpaid cash"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={paymentFilter === value ? "default" : "outline"}
                  onClick={() => setPaymentFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase self-center mr-1">Type</span>
              {(
                [
                  ["all", "All"],
                  ["table", "Table"],
                  ["pickup", "Pickup"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={serviceFilter === value ? "default" : "outline"}
                  onClick={() => setServiceFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="active">Active ({filteredOpenOrders.length})</TabsTrigger>
                <TabsTrigger value="served">Served ({filteredServedOrders.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-3">
                {filteredOpenOrders.length === 0 && (
                  <p className="text-sm text-slate-500 py-6 text-center">No active orders match the current filters.</p>
                )}
                {filteredOpenOrders.map((entry) => renderOrderCard(entry, true))}
              </TabsContent>

              <TabsContent value="served" className="space-y-3">
                <div className="flex items-center justify-between gap-2 pb-1">
                  <p className="text-xs text-slate-500">
                    {servedOrders.length} served order{servedOrders.length === 1 ? "" : "s"} in history
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={servedOrders.length === 0 || clearServedOrdersMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove all ${servedOrders.length} served order(s) from the list? This cannot be undone.`,
                        )
                      ) {
                        clearServedOrdersMutation.mutate();
                      }
                    }}
                  >
                    {clearServedOrdersMutation.isPending ? "Clearing…" : "Clear served"}
                  </Button>
                </div>
                {filteredServedOrders.length === 0 && (
                  <p className="text-sm text-slate-500 py-6 text-center">No served orders match the current filters.</p>
                )}
                {filteredServedOrders.map((entry) => renderOrderCard(entry, false))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
