import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StaffOrderDetails } from "@/types/pos";
import {
  showNewOrderNotifications,
  startRepeatingOrderAlarm,
  startTitleAlert,
  stopRepeatingOrderAlarm,
  stopTitleAlert,
  type NewOrderNotificationEntry,
} from "@/lib/order-alarm";

function formatOrderNotificationSummary(entry: StaffOrderDetails): string {
  const order = entry.order;
  if (order.serviceMode === "table") {
    const code = order.tableCode || "—";
    const label = order.tableLabel?.trim();
    return label ? `Table ${code} (${label})` : `Table ${code}`;
  }
  return `Pickup · ${order.pickupPoint || "bar"}`;
}

export function useNewOrderAlarm(
  orders: StaffOrderDetails[],
  options: { enabled: boolean; active: boolean },
) {
  const [unacknowledgedIds, setUnacknowledgedIds] = useState<number[]>([]);
  const seenOrderIdsRef = useRef<Set<number> | null>(null);
  const { enabled, active } = options;

  useEffect(() => {
    if (!active) {
      seenOrderIdsRef.current = null;
      setUnacknowledgedIds([]);
      return;
    }

    const currentIds = new Set(orders.map((entry) => entry.order.id));

    if (seenOrderIdsRef.current === null) {
      seenOrderIdsRef.current = currentIds;
      return;
    }

    const newOrderIds = [...currentIds].filter((id) => !seenOrderIdsRef.current!.has(id));
    seenOrderIdsRef.current = currentIds;

    if (newOrderIds.length > 0) {
      setUnacknowledgedIds((previous) => [...new Set([...previous, ...newOrderIds])]);
      if (enabled) {
        const notifications: NewOrderNotificationEntry[] = orders
          .filter((entry) => newOrderIds.includes(entry.order.id))
          .map((entry) => ({
            orderId: entry.order.id,
            orderNumber: entry.order.orderNumber,
            summary: formatOrderNotificationSummary(entry),
          }));
        showNewOrderNotifications(notifications);
        if (typeof document !== "undefined" && document.hidden) {
          const message =
            notifications.length === 1 ? "New order!" : `${notifications.length} new orders!`;
          startTitleAlert(message);
        }
      }
    }
  }, [orders, active, enabled]);

  useEffect(() => {
    if (enabled && active && unacknowledgedIds.length > 0) {
      startRepeatingOrderAlarm();
      return () => stopRepeatingOrderAlarm();
    }
    stopRepeatingOrderAlarm();
  }, [enabled, active, unacknowledgedIds.length]);

  useEffect(() => {
    if (!enabled || !active || unacknowledgedIds.length === 0) {
      stopTitleAlert();
      return;
    }

    const syncTitleAlert = () => {
      if (unacknowledgedIds.length === 0) {
        stopTitleAlert();
        return;
      }
      if (document.hidden) {
        const message =
          unacknowledgedIds.length === 1
            ? "New order!"
            : `${unacknowledgedIds.length} new orders!`;
        startTitleAlert(message);
      } else {
        stopTitleAlert();
      }
    };

    syncTitleAlert();
    document.addEventListener("visibilitychange", syncTitleAlert);
    return () => {
      document.removeEventListener("visibilitychange", syncTitleAlert);
      stopTitleAlert();
    };
  }, [enabled, active, unacknowledgedIds.length]);

  const unacknowledgedOrders = useMemo(
    () => orders.filter((entry) => unacknowledgedIds.includes(entry.order.id)),
    [orders, unacknowledgedIds],
  );

  const acknowledgeOrder = useCallback((orderId: number) => {
    setUnacknowledgedIds((previous) => previous.filter((id) => id !== orderId));
  }, []);

  const acknowledgeAll = useCallback(() => {
    setUnacknowledgedIds([]);
  }, []);

  return {
    unacknowledgedOrders,
    unacknowledgedCount: unacknowledgedIds.length,
    acknowledgeOrder,
    acknowledgeAll,
  };
}
