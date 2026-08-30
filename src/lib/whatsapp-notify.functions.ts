import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const messageSchema = z.object({
  phone: z.string().trim().min(7).max(20),
  text: z.string().trim().min(1).max(1000),
});

/**
 * Delivers app notifications (reminders, payment confirmations, new month) to
 * WhatsApp. Authenticated callers only; failures are reported, never thrown.
 */
export const sendWhatsappNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ messages: z.array(messageSchema).max(500) }).parse(input))
  .handler(async ({ data }) => {
    const { sendWhatsappText } = await import("./whatsapp.server");
    let sent = 0;
    for (const m of data.messages) {
      // Sequential sending keeps the provider from rate-limiting bulk sends.
      if (await sendWhatsappText(m.phone, m.text)) sent += 1;
    }
    return { sent, total: data.messages.length };
  });
