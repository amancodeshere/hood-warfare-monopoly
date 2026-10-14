function deliveryConfig() {
  const provider = process.env.EMAIL_PROVIDER || "resend";
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return null;
  if (provider === "resend" && process.env.RESEND_API_KEY)
    return { provider, from, key: process.env.RESEND_API_KEY };
  if (provider === "brevo" && process.env.BREVO_API_KEY) {
    const named = from.match(/^([^<>]+)\s*<([^<>]+)>$/);
    const email = (named ? named[2] : from).trim();
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) return null;
    return {
      provider,
      key: process.env.BREVO_API_KEY,
      sender: { email, name: named ? named[1].trim() : "Spin the Block" },
    };
  }
  return null;
}

export const emailAvailable = () => !!deliveryConfig();
export async function sendVerification({ email, code }) {
  const config = deliveryConfig();
  if (!config)
    throw new Error(
      "Email verification is not available yet. Continue playing with the two guest maps.",
    );
  try {
    const text = `Your verification code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email. Never share this code.`;
    const subject = "Your Spin the Block verification code";
    const brevo = config.provider === "brevo";
    const response = await fetch(
      brevo
        ? "https://api.brevo.com/v3/smtp/email"
        : "https://api.resend.com/emails",
      {
        method: "POST",
        signal: AbortSignal.timeout(6000),
        headers: {
          ...(brevo
            ? { "api-key": config.key }
            : { Authorization: `Bearer ${config.key}` }),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          brevo
            ? {
                sender: config.sender,
                to: [{ email }],
                subject,
                textContent: text,
                htmlContent: `<p>${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</p>`,
              }
            : {
                from: config.from,
                to: [email],
                subject,
                text,
              },
        ),
      },
    );
    if (!response.ok) throw new Error("Delivery failed");
    if (brevo && !(await response.json()).messageId)
      throw new Error("Delivery not accepted");
  } catch {
    throw new Error(
      "Could not send your code. Check the address and try again later.",
    );
  }
}
