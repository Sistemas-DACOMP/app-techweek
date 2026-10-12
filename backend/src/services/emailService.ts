// Envio de e-mail transacional via API HTTPS do Resend (fetch nativo, sem
// dependência nova). Variáveis de ambiente (NUNCA versionar valores reais):
//   RESEND_API_KEY  chave da API do Resend. Se ausente, o envio é pulado.
//   EMAIL_FROM      remetente, ex: "TechWeek <convite@dominio-verificado.com>".
//   APP_BASE_URL    endereço público do app, usado pra montar o link do convite.
//                   Inclui o caminho se o app não está na raiz (ex: GitHub Pages em
//                   https://sistemas-dacomp.github.io/app-techweek). O app usa HashRouter,
//                   por isso o link leva `/#/` (e o token fica no fragmento, que o
//                   navegador não manda ao servidor).
//
// Nunca loga token nem link: só o resultado do envio.

const RESEND_URL = 'https://api.resend.com/emails';

export function buildInviteLink(token: string): string {
  const base = (process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '');
  return `${base}/#/sponsor/invite/${token}`;
}

function escapeHtml(value: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (c) => map[c]);
}

export interface SponsorInviteEmail {
  to: string;
  sponsorName: string;
  link: string;
  expiresAt: Date;
}

/** Devolve true só se o Resend aceitou a mensagem. Nunca lança. */
export async function sendSponsorInviteEmail(input: SponsorInviteEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn('emailService: RESEND_API_KEY/EMAIL_FROM ausente, envio de convite pulado.');
    return false;
  }

  const expires = input.expiresAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const text = [
    'Olá!',
    '',
    `A organização da FACOM Tech Week convidou você para fazer parte da equipe de ${input.sponsorName} no evento.`,
    'Pra criar seu acesso de patrocinador, é só abrir o link abaixo e preencher seus dados:',
    '',
    input.link,
    '',
    `O convite vale até ${expires}. Se você não esperava esse e-mail, pode ignorar.`,
    '',
    'Equipe FACOM Tech Week'
  ].join('\n');
  const html =
    `<p>Olá!</p><p>A organização da FACOM Tech Week convidou você para fazer parte da equipe de <strong>${escapeHtml(input.sponsorName)}</strong> no evento.</p>` +
    `<p>Pra criar seu acesso de patrocinador, é só abrir o link abaixo e preencher seus dados:</p>` +
    `<p><a href="${escapeHtml(input.link)}">Aceitar convite</a></p>` +
    `<p>O convite vale até ${expires}. Se você não esperava esse e-mail, pode ignorar.</p><p>Equipe FACOM Tech Week</p>`;

  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `Convite para a equipe de ${input.sponsorName} na FACOM Tech Week`,
        text,
        html
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      console.error('emailService: Resend recusou o envio, status', response.status);
      return false;
    }
    return true;
  } catch (error: any) {
    console.error('emailService: falha de rede no envio:', error?.name || 'erro');
    return false;
  }
}
