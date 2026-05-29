export interface VivaReturnParams {
  transactionId?: string;
  orderCode?: string;
  eventId?: number;
  lang?: string;
}

export function readVivaReturnParams(search: string): VivaReturnParams {
  const params = new URLSearchParams(search);
  const transactionId = params.get("t")?.trim() || undefined;
  const orderCode = params.get("s")?.trim() || undefined;
  const eventIdRaw = params.get("eventId");
  const eventId = eventIdRaw ? Number(eventIdRaw) : undefined;
  const lang = params.get("lang")?.trim() || undefined;
  return {
    transactionId,
    orderCode,
    eventId: Number.isFinite(eventId) ? eventId : undefined,
    lang,
  };
}
