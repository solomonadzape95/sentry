type Mail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function emailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Demo builds log mail to the server and expose the link in the admin UI.
 * Production must configure RESEND_API_KEY and MAIL_FROM so tokens never reach
 * the browser.
 */
export async function sendMail(mail: Mail): Promise<{ delivered: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.info(`[mail:dev] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "Sentry <no-reply@localhost>",
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html ?? `<pre>${mail.text}</pre>`,
    }),
  });

  if (!response.ok) {
    console.error("[mail] delivery failed", response.status, await response.text());
    return { delivered: false };
  }

  return { delivered: true };
}
