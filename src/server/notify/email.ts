export type Email = { to: string; subject: string; text: string };

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Console driver until IBMV chooses an email provider (decision D5).
 * Bodies contain one-time links, so they are only printed outside production.
 */
export async function sendEmail(email: Email) {
  if (process.env.NODE_ENV === "production") {
    console.warn(`[email] no provider configured; message "${email.subject}" was not sent`);
    return;
  }
  console.info(`[email:console] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
}
