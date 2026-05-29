import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { readVivaReturnParams } from "@/lib/viva-return-params";
import { Button } from "@/components/ui/button";

type FinalizeState =
  | { phase: "loading" }
  | { phase: "success"; orderNumber?: string; message: string }
  | { phase: "error"; message: string };

export default function PaymentSuccessPage() {
  const params = useMemo(() => readVivaReturnParams(window.location.search), []);
  const [state, setState] = useState<FinalizeState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!params.transactionId && !params.orderCode) {
        setState({
          phase: "error",
          message: "Missing payment reference. If you were charged, contact the bar staff.",
        });
        return;
      }

      try {
        const response = await apiRequest("POST", "/api/payments/viva/finalize", {
          orderCode: params.orderCode,
          transactionId: params.transactionId,
        });
        const body = (await response.json()) as {
          status?: string;
          orderNumber?: string;
          message?: string;
        };

        if (cancelled) {
          return;
        }

        if (body.status === "succeeded" || body.status === "already_completed") {
          setState({
            phase: "success",
            orderNumber: body.orderNumber,
            message: body.message || "Payment successful. Your order was sent to the kitchen.",
          });
          return;
        }

        setState({
          phase: "error",
          message: body.message || "Payment could not be confirmed.",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          phase: "error",
          message: error instanceof Error ? error.message : "Payment confirmation failed.",
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [params.orderCode, params.transactionId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border bg-white p-6 shadow-sm space-y-4 text-center">
        {state.phase === "loading" && (
          <>
            <h1 className="text-xl font-semibold text-slate-900">Confirming payment…</h1>
            <p className="text-sm text-slate-600">Please wait while we verify your card payment.</p>
          </>
        )}
        {state.phase === "success" && (
          <>
            <h1 className="text-xl font-semibold text-emerald-800">Payment successful</h1>
            <p className="text-sm text-slate-600">{state.message}</p>
            {state.orderNumber ? (
              <p className="text-base font-medium text-slate-900">Order {state.orderNumber}</p>
            ) : null}
          </>
        )}
        {state.phase === "error" && (
          <>
            <h1 className="text-xl font-semibold text-red-800">Payment issue</h1>
            <p className="text-sm text-slate-600">{state.message}</p>
            {params.orderCode ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/payment/failed${window.location.search}`}>View payment details</Link>
              </Button>
            ) : null}
          </>
        )}
        <Button asChild className="w-full">
          <Link href="/menu">Back to menu</Link>
        </Button>
      </div>
    </div>
  );
}
