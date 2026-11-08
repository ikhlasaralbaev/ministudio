/** Accounts made from Telegram alone carry a placeholder email (tg<id>@telegram.invalid): never show it as an email. */
export function shownEmail(email: string | null | undefined): string {
  if (!email) return "";
  const m = /^tg(\d+)@telegram\.invalid$/.exec(email);
  return m ? `Telegram #${m[1]}` : email;
}
