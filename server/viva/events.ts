/** User-facing messages for Viva redirect `eventId` query parameters. */
const EVENT_MESSAGES: Record<number, { en: string; el: string }> = {
  0: {
    en: "Payment completed successfully.",
    el: "Η πληρωμή ολοκληρώθηκε επιτυχώς.",
  },
  10051: {
    en: "Insufficient funds. Please use another card or payment method.",
    el: "Ανεπαρκές υπόλοιπο. Δοκιμάστε άλλη κάρτα ή τρόπο πληρωμής.",
  },
  10054: {
    en: "The card was declined. Please contact your bank or try another card.",
    el: "Η κάρτα απορρίφθηκε. Επικοινωνήστε με την τράπεζά σας ή δοκιμάστε άλλη κάρτα.",
  },
  10057: {
    en: "Payment was cancelled.",
    el: "Η πληρωμή ακυρώθηκε.",
  },
  10058: {
    en: "Payment expired. Please try again.",
    el: "Η πληρωμή έληξε. Παρακαλώ δοκιμάστε ξανά.",
  },
};

export function getVivaEventMessage(eventId: number | null | undefined, lang?: string): string {
  const id = typeof eventId === "number" && Number.isFinite(eventId) ? eventId : null;
  const useGreek = (lang || "").toLowerCase().startsWith("el");
  if (id !== null && EVENT_MESSAGES[id]) {
    return useGreek ? EVENT_MESSAGES[id].el : EVENT_MESSAGES[id].en;
  }
  if (id !== null && id !== 0) {
    return useGreek
      ? `Η πληρωμή δεν ολοκληρώθηκε (κωδικός ${id}).`
      : `Payment was not completed (code ${id}).`;
  }
  return useGreek
    ? "Η πληρωμή δεν ολοκληρώθηκε. Μπορείτε να δοκιμάσετε ξανά."
    : "Payment was not completed. You can try again.";
}
