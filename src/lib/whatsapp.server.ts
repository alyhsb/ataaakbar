/** Server-only helpers for sending WhatsApp messages through WasenderAPI. */

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Converts a locally written Iraqi number (07XX…) to E.164 for WhatsApp. */
export function toE164(phone: string) {
  let d = digits(phone);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("964")) return `+${d}`;
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && d.startsWith("7")) return `+964${d}`;
  return `+${d}`;
}

/** Sends one WhatsApp text message; resolves to false instead of throwing. */
export async function sendWhatsappText(phone: string, text: string) {
  const apiKey = process.env["WASENDER_API_KEY"];
  if (!apiKey) return false;
  if (digits(phone).length < 7) return false;

  try {
    const response = await fetch("https://wasenderapi.com/api/send-message", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: toE164(phone), text }),
    });
    if (!response.ok) {
      console.error(`WasenderAPI notify failed [${response.status}]: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("WasenderAPI notify error", err);
    return false;
  }
}
