import { useEffect, useMemo, useState } from 'react';
import { Mail, Plus, Loader2, MessageCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatFileSize } from '../../lib/validators';
import { GitHubIcon } from '../../components/ParticipantCard';
import { getAffiliationBadge } from '../../components/SponsorLeadModal';
import { buildWhatsAppLink } from '../../lib/whatsapp';
import { getSponsorSettings, saveSponsorSettings, subscribeToSponsorSettings, interpolateTemplate } from '../../lib/sponsorSettingsService';
import { Avatar, StarsInput, TagChip, TierStripe } from './ui';
import { collectedLabel, groupTags, leadSubtitle } from './util';

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const Card = ({ title, aside, children }) => (
  <section className="rounded-[20px] border border-line bg-surface p-[18px]">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="m-0 text-[15px] font-extrabold">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

const cleanHandle = (v = '') => String(v).replace(/^@/, '').replace(/^https?:\/\/(www\.)?(github\.com|linkedin\.com\/in)\//i, '').replace(/\/$/, '');

/**
 * Dossiê do candidato (lead). Edição salva via onUpdate -> updateLead (rating, notes, tags).
 * Use `key={lead.participantUid}` para reiniciar o estado ao trocar de candidato.
 */
export default function LeadDossier({ lead, companyName, companyId, tier, onUpdate, onManageTags }) {
  const [rating, setRating] = useState(Number(lead.rating) || 0);
  const [notes, setNotes] = useState(lead.notes || '');
  const [tags, setTags] = useState(Array.isArray(lead.tags) ? lead.tags : []);
  const [status, setStatus] = useState('saved'); // saved | saving | dirty | error
  const [settings, setSettings] = useState(() => getSponsorSettings(companyId));
  const [tplId, setTplId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [dynamicResume, setDynamicResume] = useState(() => ({
    resumeUrl: lead.resumeUrl || null,
    resumeName: lead.resumeName || null,
    resumeSize: lead.resumeSize ?? null,
    resumeUpdatedAt: lead.resumeUpdatedAt || null
  }));

  useEffect(() => subscribeToSponsorSettings(companyId, setSettings), [companyId]);

  useEffect(() => {
    let isMounted = true;
    if (lead.resumeUrl) {
      setDynamicResume({
        resumeUrl: lead.resumeUrl,
        resumeName: lead.resumeName || 'curriculo.pdf',
        resumeSize: lead.resumeSize,
        resumeUpdatedAt: lead.resumeUpdatedAt
      });
      return;
    }

    const targetUid = lead.participantUid;
    if (!targetUid || String(targetUid).startsWith('temp_') || String(targetUid).startsWith('sympla_')) {
      return;
    }

    const fetchResume = async () => {
      try {
        const uDoc = await getDoc(doc(db, 'users', targetUid));
        if (isMounted && uDoc?.exists()) {
          const data = uDoc.data();
          if (data?.resumeUrl) {
            setDynamicResume({
              resumeUrl: data.resumeUrl,
              resumeName: data.resumeName || 'curriculo.pdf',
              resumeSize: data.resumeSize,
              resumeUpdatedAt: data.resumeUpdatedAt
            });
          }
        }
      } catch (_) {}
    };

    fetchResume();
    return () => {
      isMounted = false;
    };
  }, [lead.participantUid, lead.resumeUrl, lead.resumeName, lead.resumeSize, lead.resumeUpdatedAt]);

  const save = async (next) => {
    setStatus('saving');
    try {
      await onUpdate({ participantUid: lead.participantUid, rating, notes, tags, ...next });
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const changeRating = (n) => {
    const v = rating === n ? 0 : n;
    setRating(v);
    save({ rating: v });
  };
  const toggleTag = (t) => {
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    setTags(next);
    save({ tags: next });
  };
  const addTag = (e) => {
    e.preventDefault();
    const clean = draft.trim();
    if (!clean) return;
    if (!settings.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) saveSponsorSettings(companyId, { tags: [...settings.tags, clean] });
    if (!tags.includes(clean)) toggleTag(clean);
    setDraft('');
    setAdding(false);
  };

  const groups = useMemo(() => groupTags([...new Set([...settings.tags, ...tags])]), [settings.tags, tags]);
  const aff = getAffiliationBadge(lead);
  const github = cleanHandle(lead.github);
  const linkedin = cleanHandle(lead.linkedin);
  const collector = lead.collectedByName || lead.collectedByEmail;
  const when = collectedLabel(lead.createdAt);

  const templates = settings.templates;
  const tpl = templates.find((t) => t.id === (tplId || settings.activeTemplateId)) || templates[0];
  const text = interpolateTemplate(tpl?.text || '', { name: lead.name, companyName, course: lead.course });
  const url = buildWhatsAppLink(lead.phone, (lead.name || '').split(' ')[0], companyName, text);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
        <TierStripe tier={tier} />
        <div className="flex items-center gap-4 px-5 py-[18px]">
          <Avatar name={lead.name} size={64} />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-[22px] font-extrabold">{lead.name}</h2>
            <div className="mt-0.5 text-[14px] text-text-2">{leadSubtitle(lead)}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="font-extrabold text-link">{aff.label}</span>
              {(collector || when) && <><span aria-hidden="true" className="size-[3px] rounded-full bg-text-4" /><span className="text-text-3">Coletado{collector ? ` por ${collector}` : ''}{when ? ` · ${when}` : ''}</span></>}
            </div>
          </div>
        </div>
      </div>

      <Card title="Avaliação" aside={<span className="text-[12px] text-text-3">Toque numa estrela para mudar</span>}>
        <div className="flex items-center gap-4">
          <StarsInput value={rating} onChange={changeRating} />
          <span className="text-[12px] text-text-3">{rating > 0 ? `${rating} de 5 estrelas` : 'Sem nota'}</span>
        </div>
      </Card>

      <Card title="Contatos">
        {(lead.email || linkedin || github) ? (
          <div className="grid gap-2.5 sm:grid-cols-3">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="tw-press flex h-12 min-w-0 items-center gap-2.5 rounded-[14px] border border-line-2 bg-surface-selected px-3.5 text-[14px] font-bold">
                <Mail size={20} aria-hidden="true" className="shrink-0 text-link" /><span className="truncate">{lead.email}</span>
              </a>
            )}
            {linkedin && (
              <a href={`https://linkedin.com/in/${linkedin}`} target="_blank" rel="noopener noreferrer" className="tw-press flex h-12 min-w-0 items-center gap-2.5 rounded-[14px] border border-[#B9DAFF55] px-3.5 text-[14px] font-bold text-[#B9DAFF]" style={{ background: '#0A66C2' }}>
                <LinkedInIcon /><span className="truncate">in/{linkedin}</span>
              </a>
            )}
            {github && (
              <a href={`https://github.com/${github}`} target="_blank" rel="noopener noreferrer" className="tw-press flex h-12 min-w-0 items-center gap-2.5 rounded-[14px] border border-[#E2E8F055] px-3.5 text-[14px] font-bold text-[#E2E8F0]" style={{ background: '#2B3346' }}>
                <GitHubIcon size={20} color="currentColor" /><span className="truncate">{github}</span>
              </a>
            )}
          </div>
        ) : <p className="m-0 text-[13px] text-text-3">O participante não informou contatos públicos.</p>}
      </Card>

      <Card title="Currículo">
        {dynamicResume.resumeUrl ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-line-2 bg-surface-selected p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-action/10 text-link">
                <FileText size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-text">
                  {dynamicResume.resumeName || 'Currículo do Candidato'}
                </div>
                <div className="text-[12px] text-text-3">
                  {dynamicResume.resumeSize ? formatFileSize(dynamicResume.resumeSize) : 'Documento anexado'}
                  {dynamicResume.resumeUpdatedAt && (
                    <span> · Atualizado {new Date(dynamicResume.resumeUpdatedAt).toLocaleDateString('pt-BR')}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <a
                href={dynamicResume.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tw-press flex h-11 min-w-[96px] flex-1 items-center justify-center gap-2 rounded-xl border border-line-2 bg-surface px-3.5 text-[13px] font-bold text-text hover:border-link sm:flex-initial"
              >
                <ExternalLink size={16} aria-hidden="true" className="text-link" />
                <span>Abrir</span>
              </a>
              <a
                href={dynamicResume.resumeUrl}
                download={dynamicResume.resumeName || 'curriculo.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="tw-press flex h-11 min-w-[96px] flex-1 items-center justify-center gap-2 rounded-xl bg-action px-3.5 text-[13px] font-bold text-white hover:opacity-90 sm:flex-initial"
              >
                <Download size={16} aria-hidden="true" />
                <span>Baixar</span>
              </a>
            </div>
          </div>
        ) : (
          <p className="m-0 text-[13px] text-text-3">O participante ainda não anexou um currículo.</p>
        )}
      </Card>

      <Card title="Tags" aside={onManageTags && <button type="button" onClick={onManageTags} className="tw-press min-h-11 text-[12px] font-bold text-link">Gerenciar</button>}>
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.id} role="group" aria-label={g.label}>
              <div className="mb-1.5 text-[12px] font-bold text-text-3">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {g.tags.map((t) => <TagChip key={t} size="lg" color={g.color} active={tags.includes(t)} onClick={() => toggleTag(t)}>{t}</TagChip>)}
              </div>
            </div>
          ))}
          {adding ? (
            <form onSubmit={addTag} className="flex flex-wrap items-center gap-2">
              <label htmlFor="sp-new-tag" className="sr-only">Nome da tag</label>
              <input id="sp-new-tag" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} placeholder="Nome da tag" className="field min-w-0 flex-1" style={{ minHeight: 44 }} />
              <button type="submit" className="tw-press h-11 rounded-xl bg-action px-4 text-[14px] font-bold text-white">Adicionar</button>
              <button type="button" onClick={() => setAdding(false)} className="h-11 px-3 text-[14px] font-bold text-text-3">Cancelar</button>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="tw-press inline-flex h-11 items-center gap-1.5 self-start text-[14px] font-bold text-link">
              <Plus size={18} aria-hidden="true" />Nova tag
            </button>
          )}
        </div>
      </Card>

      <Card title="Anotações da equipe" aside={
        <span role="status" className={`flex items-center gap-1 text-[12px] font-bold ${status === 'saved' ? 'text-ok' : status === 'error' ? 'text-err' : 'text-text-3'}`}>
          {status === 'saving' && <Loader2 size={12} aria-hidden="true" className="animate-spin" />}
          {{ saved: 'Salvo', saving: 'Salvando', dirty: 'Alterações não salvas', error: 'Erro ao salvar' }[status]}
        </span>}>
        <label htmlFor="sp-notes" className="sr-only">Anotações da equipe</label>
        <textarea id="sp-notes" rows={3} value={notes} onChange={(e) => { setNotes(e.target.value); setStatus('dirty'); }}
          onBlur={() => status === 'dirty' && save({ notes })} placeholder="Observações da conversa, fit com a vaga, projetos de destaque..."
          className="w-full resize-none rounded-[14px] border border-line-2 bg-bg px-4 py-3.5 text-[14px] leading-normal text-text outline-none placeholder:text-text-4 focus:border-link" />
        {status === 'error' && <button type="button" onClick={() => save({ notes })} className="mt-2 text-[12px] font-bold text-link">Tentar de novo</button>}
      </Card>

      <section className="rounded-[20px] border border-line bg-surface p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[rgba(37,211,102,.14)] text-[#25D366]"><MessageCircle size={18} aria-hidden="true" /></span>
          <h3 className="m-0 text-[15px] font-extrabold">Mensagem pronta</h3>
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,280px)_1fr]">
          <div role="radiogroup" aria-label="Modelo de mensagem" className="flex flex-col gap-0.5">
            {templates.map((t) => {
              const on = t.id === tpl?.id;
              return (
                <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setTplId(t.id)}
                  className={`tw-press flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-left ${on ? 'bg-surface-selected' : ''}`}>
                  <span aria-hidden="true" className="size-[18px] shrink-0 rounded-full" style={{ border: on ? '5px solid var(--ok)' : '2px solid var(--text-4)' }} />
                  <span className={`flex-1 text-[14px] ${on ? 'font-bold text-text' : 'font-medium text-text-2'}`}>{t.title}</span>
                  {t.id === settings.activeTemplateId && <span className="text-[11px] font-extrabold text-ok">Padrão</span>}
                </button>
              );
            })}
          </div>
          <div>
            <div className="rounded-2xl bg-[#0B141A] p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span aria-hidden="true" className="flex size-[26px] items-center justify-center rounded-full bg-[#00A884] text-[12px] font-extrabold text-white">{(lead.name || 'P')[0]}</span>
                <span className="text-[13px] font-semibold text-[#E9EDEF]">{lead.name}</span>
                {lead.phone && <span className="ml-auto text-[12px] text-[#8696A0]">{lead.phone}</span>}
              </div>
              <div className="ml-auto max-w-[94%] break-words rounded-[12px_2px_12px_12px] bg-[#005C4B] px-3 py-2.5 text-[14px] leading-normal text-[#E9EDEF]">{text}</div>
              <div className="mt-1 text-right text-[11px] text-[#8696A0]">agora</div>
            </div>
            <button type="button" disabled={!url} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              className={`tw-press mt-3.5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] text-[15px] font-extrabold ${url ? 'bg-[#128C4A] text-white' : 'cursor-not-allowed bg-surface-raised text-text-3'}`}>
              <MessageCircle size={20} aria-hidden="true" />{url ? 'Enviar pelo WhatsApp' : 'Sem telefone válido'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
