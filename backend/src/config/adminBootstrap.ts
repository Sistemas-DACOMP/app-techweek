/**
 * Bootstrap TEMPORÁRIO do primeiro ADMIN, via env ADMIN_BOOTSTRAP_EMAILS
 * (e-mails separados por vírgula). Vazia por padrão: ninguém vira ADMIN por e-mail.
 * Só vale com e-mail verificado — senão qualquer um cadastraria o e-mail alheio.
 */
export function isBootstrapAdmin(email?: string | null, emailVerified?: boolean): boolean {
  if (emailVerified !== true || !email || typeof email !== 'string') return false;
  const list = (process.env.ADMIN_BOOTSTRAP_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
