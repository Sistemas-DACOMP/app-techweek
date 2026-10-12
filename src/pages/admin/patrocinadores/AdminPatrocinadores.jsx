import { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, Mail, Pencil, Plus } from 'lucide-react';
import { PageHead, Section, Toast, EmptyState, ICON_BTN, btn } from '../ui';
import {
  addSponsorInvites, inviteErrorMessage, listSponsors, resendSponsorInvite,
} from '../../../lib/sponsorInviteService';
import { LogoPlate, MemberAvatar, TierText, sentAgo } from './shared';
import SponsorDialog, { copyText } from './SponsorDialog';

/* Aba "Patrocinadores" do painel (KAN-124): empresas, cotas, equipes e convites. */

const STEPS = [
  'A organização cria a empresa, a cota e o estande.',
  'O convite vai por e-mail ou por link, só para o domínio da empresa.',
  'Cada pessoa cria a própria conta, sem ingresso do Sympla.',
  'O limite da equipe vem da cota. Quando enche, o link para de aceitar.',
];

function InvitesCell({ s }) {
  const pending = s.invites?.PENDING || 0;
  const expired = s.invites?.EXPIRED || 0;
  return (
    <span className="text-[13px] font-bold">
      {pending > 0 ? <span className="text-warn">{pending} {pending === 1 ? 'pendente' : 'pendentes'}</span>
        : (s.invites?.ACCEPTED || s.memberCount) ? <span className="text-ok">Todos aceitos</span>
          : <span className="text-text-3">nenhum convite</span>}
      {expired > 0 && <span className="ml-2 text-err">{expired} {expired === 1 ? 'expirado' : 'expirados'}</span>}
    </span>
  );
}

function TeamCell({ s }) {
  const members = s.members || [];
  const limit = s.teamLimit;
  const full = limit && s.memberCount >= limit;
  return (
    <span className="flex items-center gap-2.5 text-[13px] text-text-2">
      {members.length > 0 && (
        <span className="flex">
          {members.slice(0, 4).map((m, i) => <MemberAvatar key={m.uid} member={m} overlap={i > 0} />)}
        </span>
      )}
      <span>{members.length === 0 && <span className="mr-2 text-text-3">ninguém ainda</span>}{s.memberCount} de {limit || '?'}{full ? ' · cheia' : ''}</span>
    </span>
  );
}

export default function AdminPatrocinadores() {
  const [sponsors, setSponsors] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [dialog, setDialog] = useState(null); // null | {} (novo) | sponsor (editar)
  const [feedback, setFeedback] = useState(null);
  const [fresh, setFresh] = useState([]); // convites criados/reenviados nesta sessão (único momento em que o link vem do servidor)
  const [busyId, setBusyId] = useState('');
  const closeFeedback = useCallback(() => setFeedback(null), []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await listSponsors();
      setSponsors(Array.isArray(res) ? res : res.sponsors || []);
    } catch (e) {
      setLoadError(inviteErrorMessage(e));
      setSponsors((s) => s || []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const copyLink = async (link) => {
    const ok = await copyText(link);
    setFeedback(ok ? { type: 'success', title: 'Link copiado' } : { type: 'error', title: 'Não deu para copiar', message: link });
  };

  // "Copiar convite": gera um link genérico (multiuso) da empresa e copia.
  const copyInvite = async (s) => {
    setBusyId(s.sponsorId);
    try {
      const res = await addSponsorInvites(s.sponsorId, []);
      const inv = res.invites?.[0];
      if (!inv?.link) throw new Error('sem link');
      await copyLink(inv.link);
      load();
    } catch (e) {
      setFeedback({ type: 'error', title: 'Não foi possível gerar o convite', message: inviteErrorMessage(e) });
    }
    setBusyId('');
  };

  const resend = async (inv) => {
    setBusyId(inv.inviteId);
    try {
      const res = await resendSponsorInvite(inv.inviteId);
      setFresh((l) => l.map((x) => (x.inviteId === inv.inviteId ? { ...x, ...res } : x)));
      if (res.emailSent) setFeedback({ type: 'success', title: 'Convite reenviado', message: res.email });
      else setFeedback({ type: 'error', title: 'E-mail não enviado, copie o link', action: { label: 'Copiar link', run: () => copyLink(res.link) } });
      load();
    } catch (e) {
      setFeedback({ type: 'error', title: 'Não foi possível reenviar', message: inviteErrorMessage(e) });
    }
    setBusyId('');
  };

  const total = sponsors?.length || 0;
  const people = (sponsors || []).reduce((n, s) => n + (s.memberCount || 0), 0);
  const pendingTotal = (sponsors || []).reduce((n, s) => n + (s.invites?.PENDING || 0), 0);
  const newBtn = (
    <button type="button" className={btn('action', 'mo-hover')} onClick={() => setDialog({})}>
      <Plus size={18} aria-hidden="true" /> Novo patrocinador
    </button>
  );

  return (
    <div>
      <PageHead
        title="Patrocinadores"
        subtitle={sponsors ? `${total} ${total === 1 ? 'empresa' : 'empresas'} · ${people} pessoas nas equipes · ${pendingTotal} convites pendentes` : 'Carregando'}
      >
        {newBtn}
      </PageHead>
      <div className="mb-4 lg:hidden">{newBtn}</div>

      {loadError && (
        <p role="alert" className="mb-4 flex items-center gap-3 rounded-[14px] bg-surface p-3.5 text-[13px] text-err">
          {loadError}
          <button type="button" onClick={load} className="font-bold text-link">Tentar de novo</button>
        </p>
      )}

      {sponsors === null ? (
        <div className="flex justify-center py-16 text-text-3" role="status"><Loader2 className="animate-spin" aria-hidden="true" /><span className="sr-only">Carregando</span></div>
      ) : sponsors.length === 0 ? (
        <Section><EmptyState>Nenhuma empresa ainda. Crie a primeira para enviar os convites.</EmptyState></Section>
      ) : (
        <section aria-label="Empresas" className="overflow-hidden rounded-[20px] bg-surface">
          <div className="hidden grid-cols-[170px_120px_190px_1fr_190px_auto] gap-4 border-b border-line px-5 py-3.5 text-[12px] font-bold text-text-3 lg:grid" aria-hidden="true">
            <span>Empresa</span><span>Cota</span><span>Estande</span><span>Equipe</span><span>Convites</span><span className="w-[170px]" />
          </div>
          <ul className="m-0 list-none p-0">
            {sponsors.map((s, i) => (
              <li
                key={s.sponsorId}
                className="mo-up grid gap-3 border-b border-line px-5 py-4 last:border-b-0 lg:grid-cols-[170px_120px_190px_1fr_190px_auto] lg:items-center lg:gap-4"
                style={{ '--i': Math.min(i, 8) }}
              >
                <LogoPlate src={s.logoUrl} name={s.name} height={40} width={150} />
                <span className="text-[14px]"><TierText tier={s.tier} /></span>
                <span className="text-[14px] text-text-2">{s.booth?.code ? [`Estande ${s.booth.code}`, s.booth.area].filter(Boolean).join(' · ') : <span className="text-text-3">sem estande</span>}</span>
                <TeamCell s={s} />
                <InvitesCell s={s} />
                <span className="flex gap-2 lg:justify-end">
                  <button type="button" disabled={busyId === s.sponsorId} onClick={() => copyInvite(s)} className={btn('secondary', 'mo-hover min-h-11 text-[13px]')}>
                    {busyId === s.sponsorId ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />} Copiar convite
                  </button>
                  <button type="button" aria-label={`Editar ${s.name}`} title="Editar" onClick={() => setDialog(s)} className={`${ICON_BTN} mo-hover h-11 w-11`}>
                    <Pencil size={15} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Convites pendentes">
          {fresh.length === 0 && pendingTotal === 0 ? (
            <p className="m-0 text-[13px] text-text-3">Nenhum convite pendente.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0">
              {fresh.map((inv) => (
                <li key={inv.inviteId} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
                  <Mail size={16} aria-hidden="true" className="shrink-0 text-text-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{inv.email || `Link da ${inv.sponsorName}`}</span>
                    <span className={`block text-[12px] ${inv.email && inv.emailSent === false ? 'font-bold text-warn' : 'text-text-3'}`}>
                      {inv.email && inv.emailSent === false ? 'E-mail não enviado, copie o link' : sentAgo(inv.expiresAt)}
                    </span>
                  </span>
                  {inv.link && <button type="button" onClick={() => copyLink(inv.link)} className="min-h-11 px-2 text-[13px] font-bold text-link">Copiar</button>}
                  {inv.email && <button type="button" disabled={busyId === inv.inviteId} onClick={() => resend(inv)} className="min-h-11 px-2 text-[13px] font-bold text-link disabled:opacity-50">Reenviar</button>}
                </li>
              ))}
              {/* TODO(backend): GET de convites pendentes com e-mail/id para listar e reenviar os de sessões anteriores. Hoje só há contagem por empresa. */}
              {(sponsors || []).filter((s) => (s.invites?.PENDING || 0) > 0).map((s) => (
                <li key={s.sponsorId} className="flex items-center gap-3 border-t border-line py-3 text-[13px] first:border-t-0">
                  <Mail size={16} aria-hidden="true" className="shrink-0 text-text-3" />
                  <span className="min-w-0 flex-1 truncate font-bold">{s.name}</span>
                  <span className="text-warn">{s.invites.PENDING} {s.invites.PENDING === 1 ? 'pendente' : 'pendentes'}</span>
                  {(s.invites.EXPIRED || 0) > 0 && <span className="font-bold text-err">{s.invites.EXPIRED} expirado(s)</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Como funciona o cadastro">
          <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
            {STEPS.map((t, i) => (
              <li key={t} className="flex items-start gap-3 text-[14px] text-text-2">
                <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-selected text-[12px] font-extrabold text-text">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {dialog && (
        <SponsorDialog
          sponsor={dialog.sponsorId ? dialog : null}
          onClose={() => setDialog(null)}
          onNotify={setFeedback}
          onSaved={(invites, name) => {
            if (invites?.length) {
              setFresh((l) => [...invites.map((inv) => ({ ...inv, sponsorName: name })), ...l]);
            }
            load();
          }}
        />
      )}
      <Toast feedback={feedback} onClose={closeFeedback} />
    </div>
  );
}
