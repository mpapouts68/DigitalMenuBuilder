import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StaffOrderDetails } from "@/types/pos";
import { startRepeatingOrderAlarm, stopRepeatingOrderAlarm } from "@/lib/order-alarm";

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
    }
  }, [orders, active]);

  useEffect(() => {
    if (enabled && active && unacknowledgedIds.length > 0) {
      startRepeatingOrderAlarm();
      return () => stopRepeatingOrderAlarm();
    }
    stopRepeatingOrderAlarm();
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
