export const mailConfigured = Boolean(
  process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM,
);
export async function sendAuthEmail(to: string, subject: string, url: string) {
  if (!mailConfigured)
    throw Error("O envio de e-mails ainda não foi configurado.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM,
      to: [to],
      subject,
      text: `${subject}\n\nAbra este link para continuar:\n${url}\n\nSe você não solicitou esta ação, ignore este e-mail.`,
    }),
  });
  if (!response.ok) throw Error("Não foi possível enviar o e-mail.");
}
