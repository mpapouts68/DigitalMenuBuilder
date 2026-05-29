import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { readVivaReturnParams } from "@/lib/viva-return-params";
import { Button } from "@/components/ui/button";
import type { OrderCreatePayload } from "@/types/pos";

export default function PaymentFailedPage() {
  const params = useMemo(() => readVivaReturnParams(window.location.search), []);
  const [userMessage, setUserMessage] = useState(
    "Η πληρωμή δεν ολοκληρώθηκε. Μπορείτε να δοκιμάσετε ξανά.",
  );
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const response = await apiRequest("POST", "/api/payments/viva/mark-failed", {
          orderCode: params.orderCode,
          eventId: params.eventId,
          lang: params.lang,
        });
        const body = (await response.json()) as { userMessage?: string };
        if (!cancelled && body.userMessage) {
          setUserMessage(body.userMessage);
        }
      } catch {
        // Keep default message
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.eventId, params.lang, params.orderCode]);

  const handleRetry = async () => {
    if (!params.orderCode) {
      setRetryError("Missing payment reference. Return to the menu and place the order again.");
      return;
    }

    setRetrying(true);
    setRetryError(null);

    try {
      const pendingResponse = await apiRequest(
        "GET",
        `/api/payments/viva/pending?orderCode=${encodeURIComponent(params.orderCode)}`,
      );
      const pending = (await pendingResponse.json()) as {
        cart: OrderCreatePayload;
        amountCents: number;
        status: string;
      };

      if (pending.status === "succeeded") {
        window.location.href = `/payment/success?s=${encodeURIComponent(params.orderCode)}`;
        return;
      }

      const amount = pending.amountCents / 100;
      const startResponse = await apiRequest("POST", "/api/payments/viva/start", {
        ...pending.cart,
        amount,
      });
      const started = (await startResponse.json()) as { checkoutUrl?: string };
      if (!started.checkoutUrl) {
        throw new Error("Could not start a new payment session.");
      }
      window.location.assign(started.checkoutUrl);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Retry failed.");
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-white p-6 shadow-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold text-red-800">Payment not completed</h1>
        <p className="text-sm text-slate-600">{userMessage}</p>
        {retryError ? <p className="text-sm text-red-600">{retryError}</p> : null}
        <div className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => void handleRetry()} disabled={retrying}>
            {retrying ? "Redirecting…" : "Try payment again"}
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/menu">Back to menu</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
