export const emailAvailable = () =>
  !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export async function sendVerification({ email, code }) {
  if (!emailAvailable())
    throw new Error(
      "Email verification is not available yet. Continue playing with the two guest maps.",
    );
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject: "Your Spin the Block verification code",
        text: `Your verification code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email. Never share this code.`,
      }),
    });
    if (!response.ok) throw new Error("Delivery failed");
  } catch {
    throw new Error(
      "Could not send your code. Check the address and try again later.",
    );
  }
}
