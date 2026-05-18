// Format a transaction's ISO-8601 UTC timestamp for display.
// Renders in Europe/London with British conventions because that's the user
// base. Promote to config if this ever needs to handle other locales.
const transactionTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export function formatTransactionTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso; // pass through unparseable input
  return transactionTimeFormatter.format(date);
}
